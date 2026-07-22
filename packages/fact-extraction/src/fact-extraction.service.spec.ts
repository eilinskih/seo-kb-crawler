import {
  PredicateRegistryRecord,
  PredicateRegistrySnapshot,
} from '@seo-kb/ontology';
import { PredicateAliasResolverService } from '@seo-kb/ontology';
import { SeedPredicateRegistryRepository } from '@seo-kb/ontology';
import { EntityService } from '@seo-kb/entities';
import { NoFactExtractionProvider } from './domain/no-fact-extraction.provider';
import {
  CanonicalFactForStorage,
  ChunkForFactExtraction,
  FactExtractionFailure,
  FactExtractionProfile,
  FactExtractionProviderIdentity,
  FactExtractionRepository,
  FactExtractionResult,
  FactExtractionRunIdentity,
  FactExtractionRunRecord,
  FactNormalizationAttemptForStorage,
  RawFactCandidate,
  RawFactForStorage,
} from './domain/fact-extraction-types';
import { DEFAULT_FACT_EXTRACTION_PROFILE } from './domain/fact-extraction-profiles';
import { FactExtractionService } from './fact-extraction.service';
import { StaticFactExtractionProvider } from './testing/static-fact-extraction.provider';

const now = new Date('2026-07-23T00:00:00Z');
const providerIdentity: FactExtractionProviderIdentity = {
  providerKey: 'static',
  modelKey: 'fact-test',
  modelVersion: '1',
};

describe('FactExtractionService', () => {
  it('creates canonical facts only after approved predicate normalization', async () => {
    const chunk = chunkFixture();
    const repository = new InMemoryFactExtractionRepository([chunk]);
    const provider = new StaticFactExtractionProvider(providerIdentity, [
      rawCandidate({ predicateCandidate: 'cost' }),
    ]);
    const service = serviceFrom(repository, provider, registrySnapshot({
      predicates: [predicate('predicate-price', 'has_price', 'approved')],
      aliases: [alias('alias-cost', 'predicate-price', 'cost')],
    }));

    const [result] = await service.extractBatch({
      chunkIds: [chunk.id],
      now,
    });

    expect(result).toMatchObject({
      status: 'completed',
      rawFactCount: 1,
      canonicalFactCount: 1,
      rejectedCount: 0,
    });
    expect(repository.canonicalFacts[0]).toMatchObject({
      predicateId: 'predicate-price',
      subjectEntityId: 'entity-subject',
    });
  });

  it('keeps unknown predicate candidates pending instead of inventing predicates', async () => {
    const chunk = chunkFixture();
    const repository = new InMemoryFactExtractionRepository([chunk]);
    const provider = new StaticFactExtractionProvider(providerIdentity, [
      rawCandidate({ predicateCandidate: 'model invented thing' }),
    ]);
    const service = serviceFrom(repository, provider, registrySnapshot({}));

    const [result] = await service.extractBatch({
      chunkIds: [chunk.id],
      now,
    });

    expect(result).toMatchObject({
      status: 'completed',
      rawFactCount: 1,
      canonicalFactCount: 0,
      rejectedCount: 1,
    });
    expect(repository.normalizationAttempts[0]).toMatchObject({
      predicateResolutionStatus: 'not_found',
      rejectionReason: 'No registry alias matched the predicate candidate',
    });
  });

  it('records provider-unavailable runs without throwing', async () => {
    const chunk = chunkFixture();
    const repository = new InMemoryFactExtractionRepository([chunk]);
    const service = serviceFrom(
      repository,
      new NoFactExtractionProvider(),
      registrySnapshot({}),
    );

    const [result] = await service.extractBatch({
      chunkIds: [chunk.id],
      now,
    });

    expect(result.status).toBe('provider_unavailable');
    expect(repository.runs[0]).toMatchObject({
      status: 'failed_retryable',
      failure: {
        category: 'provider_unavailable',
        retryable: true,
      },
    });
  });

  it('passes known entity aliases to the extraction provider', async () => {
    const chunk = chunkFixture();
    const repository = new InMemoryFactExtractionRepository([chunk]);
    const provider = new StaticFactExtractionProvider(providerIdentity, [
      rawCandidate({ predicateCandidate: 'cost' }),
    ]);
    const entityService = {
      findMentionsInText: jest.fn().mockResolvedValue([
        {
          entity: {
            entityId: 'entity-subject',
            canonicalName: 'Laser hair removal',
            entityType: 'procedure',
            vertical: null,
            confidence: 0.9,
          },
          alias: {
            aliasId: 'alias-1',
            entityId: 'entity-subject',
            aliasText: 'laser hair removal',
            aliasType: 'exact',
            language: 'en',
            geo: null,
            confidence: 0.8,
            reviewStatus: 'approved',
          },
          mentionText: 'laser hair removal',
          confidence: 0.8,
        },
      ]),
    } as unknown as EntityService;
    const service = serviceFrom(
      repository,
      provider,
      registrySnapshot({
        predicates: [predicate('predicate-price', 'has_price', 'approved')],
        aliases: [alias('alias-cost', 'predicate-price', 'cost')],
      }),
      entityService,
    );

    await service.extractBatch({
      chunkIds: [chunk.id],
      now,
    });

    expect(provider.lastInput?.knownEntities).toEqual([
      {
        entityId: 'entity-subject',
        canonicalName: 'Laser hair removal',
        entityType: 'procedure',
        aliases: ['laser hair removal'],
        confidence: 0.8,
      },
    ]);
  });

  it('skips low-value chunks before calling the provider', async () => {
    const chunk = chunkFixture({
      id: 'chunk-low',
      text: 'tiny',
      tokenCount: 1,
      chunkType: 'unknown',
    });
    const repository = new InMemoryFactExtractionRepository([chunk]);
    const provider = new StaticFactExtractionProvider(providerIdentity, [
      rawCandidate(),
    ]);
    const service = serviceFrom(repository, provider, registrySnapshot({}));

    const [result] = await service.extractBatch({
      chunkIds: [chunk.id],
      now,
    });

    expect(result.status).toBe('skipped');
    expect(provider.calls).toBe(0);
    expect(repository.runs[0].failure).toMatchObject({
      category: 'low_value_chunk',
      retryable: false,
    });
  });

  it('is idempotent for completed chunk/profile/provider identity', async () => {
    const chunk = chunkFixture();
    const repository = new InMemoryFactExtractionRepository([chunk]);
    const provider = new StaticFactExtractionProvider(providerIdentity, [
      rawCandidate({ predicateCandidate: 'cost' }),
    ]);
    const service = serviceFrom(repository, provider, registrySnapshot({
      predicates: [predicate('predicate-price', 'has_price', 'approved')],
      aliases: [alias('alias-cost', 'predicate-price', 'cost')],
    }));

    const [first] = await service.extractBatch({ chunkIds: [chunk.id], now });
    const [second] = await service.extractBatch({ chunkIds: [chunk.id], now });

    expect(first.status).toBe('completed');
    expect(second.status).toBe('already_processed');
    expect(repository.runs).toHaveLength(1);
    expect(repository.rawFacts).toHaveLength(1);
    expect(provider.calls).toBe(1);
  });
});

function serviceFrom(
  repository: FactExtractionRepository,
  provider: ConstructorParameters<typeof FactExtractionService>[1],
  snapshot: PredicateRegistrySnapshot,
  entityService: EntityService = {
    findMentionsInText: jest.fn().mockResolvedValue([]),
  } as unknown as EntityService,
): FactExtractionService {
  return new FactExtractionService(
    repository,
    provider,
    new PredicateAliasResolverService(
      new SeedPredicateRegistryRepository(snapshot),
    ),
    entityService,
  );
}

class InMemoryFactExtractionRepository implements FactExtractionRepository {
  readonly runs: FactExtractionRunRecord[] = [];
  readonly rawFacts: RawFactForStorage[] = [];
  readonly canonicalFacts: CanonicalFactForStorage[] = [];
  readonly normalizationAttempts: FactNormalizationAttemptForStorage[] = [];

  constructor(private readonly chunks: ChunkForFactExtraction[]) {}

  async findExtractionCandidates(options: {
    limit: number;
    profile: FactExtractionProfile;
    provider: FactExtractionProviderIdentity;
  }): Promise<ChunkForFactExtraction[]> {
    return this.chunks
      .filter((chunk) => chunk.tokenCount >= options.profile.minChunkTokens)
      .filter((chunk) => {
        const run = this.runs.find((candidate) =>
          sameIdentity(candidate, chunk, options.profile, options.provider),
        );
        return !run || run.status === 'failed_retryable';
      })
      .slice(0, options.limit);
  }

  async findChunksByIds(chunkIds: string[]): Promise<ChunkForFactExtraction[]> {
    return this.chunks.filter((chunk) => chunkIds.includes(chunk.id));
  }

  async findRun(
    identity: FactExtractionRunIdentity,
  ): Promise<FactExtractionRunRecord | null> {
    return this.runs.find((run) =>
      run.chunkId === identity.chunkId &&
      run.documentVersionId === identity.documentVersionId &&
      run.profileKey === identity.profileKey &&
      run.profileVersion === identity.profileVersion &&
      run.providerKey === identity.providerKey &&
      run.modelKey === identity.modelKey &&
      run.modelVersion === identity.modelVersion &&
      run.chunkContentHash === identity.chunkContentHash,
    ) ?? null;
  }

  async startRun(
    chunk: ChunkForFactExtraction,
    identity: FactExtractionRunIdentity,
    options: { now: Date },
  ): Promise<FactExtractionRunRecord> {
    const existing = await this.findRun(identity);
    if (existing) {
      existing.status = 'extracting';
      existing.failure = null;
      existing.startedAt = options.now;
      existing.completedAt = null;
      existing.updatedAt = options.now;
      return existing;
    }

    const run: FactExtractionRunRecord = {
      id: `run-${this.runs.length + 1}`,
      topicId: chunk.topicId,
      documentId: chunk.documentId,
      documentVersionId: chunk.documentVersionId,
      chunkId: chunk.id,
      chunkContentHash: chunk.contentHash,
      profileKey: identity.profileKey,
      profileVersion: identity.profileVersion,
      providerKey: identity.providerKey,
      modelKey: identity.modelKey,
      modelVersion: identity.modelVersion,
      status: 'extracting',
      failure: null,
      startedAt: options.now,
      completedAt: null,
      createdAt: options.now,
      updatedAt: options.now,
    };
    this.runs.push(run);
    return run;
  }

  async markRunSkipped(
    run: FactExtractionRunRecord,
    failure: FactExtractionFailure,
    options: { now: Date },
  ): Promise<void> {
    this.markRun(run, 'skipped', failure, options.now);
  }

  async markRunFailed(
    run: FactExtractionRunRecord,
    failure: FactExtractionFailure,
    options: { now: Date },
  ): Promise<void> {
    this.markRun(
      run,
      failure.retryable ? 'failed_retryable' : 'failed_terminal',
      failure,
      options.now,
    );
  }

  async saveExtractionOutcome(
    run: FactExtractionRunRecord,
    outcome: {
      rawFacts: RawFactForStorage[];
      canonicalFacts: CanonicalFactForStorage[];
      normalizationAttempts: FactNormalizationAttemptForStorage[];
    },
    options: { now: Date },
  ): Promise<FactExtractionResult> {
    this.rawFacts.push(...outcome.rawFacts);
    this.canonicalFacts.push(...outcome.canonicalFacts);
    this.normalizationAttempts.push(...outcome.normalizationAttempts);
    this.markRun(run, 'completed', null, options.now);
    return {
      status: 'completed',
      runId: run.id,
      rawFactCount: outcome.rawFacts.length,
      canonicalFactCount: outcome.canonicalFacts.length,
      rejectedCount: outcome.normalizationAttempts.filter((attempt) =>
        attempt.rejectionReason,
      ).length,
    };
  }

  private markRun(
    run: FactExtractionRunRecord,
    status: FactExtractionRunRecord['status'],
    failure: FactExtractionFailure | null,
    now: Date,
  ): void {
    run.status = status;
    run.failure = failure;
    run.completedAt = now;
    run.updatedAt = now;
  }
}

function sameIdentity(
  run: FactExtractionRunRecord,
  chunk: ChunkForFactExtraction,
  profile: FactExtractionProfile,
  provider: FactExtractionProviderIdentity,
): boolean {
  return run.chunkId === chunk.id &&
    run.documentVersionId === chunk.documentVersionId &&
    run.profileKey === profile.key &&
    run.profileVersion === profile.version &&
    run.providerKey === provider.providerKey &&
    run.modelKey === provider.modelKey &&
    run.modelVersion === provider.modelVersion &&
    run.chunkContentHash === chunk.contentHash;
}

function rawCandidate(
  overrides: Partial<RawFactCandidate> = {},
): RawFactCandidate {
  return {
    subjectEntityId: 'entity-subject',
    objectCandidate: { value: '$10' },
    predicateCandidate: 'cost',
    attributesCandidate: { currency: 'USD' },
    confidence: 0.9,
    evidenceText: 'The cost is $10.',
    ...overrides,
  };
}

function chunkFixture(
  overrides: Partial<ChunkForFactExtraction> = {},
): ChunkForFactExtraction {
  return {
    id: 'chunk-1',
    chunkingRunId: 'chunking-run-1',
    documentId: 'document-1',
    documentVersionId: 'document-version-1',
    topicId: 'topic-1',
    text: 'FAQ: The service cost is $10 and is available online.',
    headingPath: ['FAQ', 'Price'],
    sectionTitle: 'Price',
    chunkType: 'faq',
    tokenCount: 12,
    language: 'en',
    geoHints: [],
    sourceMetadata: {
      requestedUrl: 'https://example.com/page',
      finalUrl: 'https://example.com/page',
      canonicalUrl: 'https://example.com/page',
      pageTitle: 'Example price',
      metaDescription: null,
    },
    documentMetadata: null,
    contentHash: 'content-hash-1',
    normalizedTextHash: 'normalized-hash-1',
    ...overrides,
  };
}

function registrySnapshot(
  partial: Partial<PredicateRegistrySnapshot>,
): PredicateRegistrySnapshot {
  return {
    predicates: partial.predicates ?? [],
    aliases: partial.aliases ?? [],
    attributeSchemas: partial.attributeSchemas ?? [],
    entityTypes: partial.entityTypes ?? [],
  };
}

function predicate(
  id: string,
  key: string,
  reviewStatus: PredicateRegistryRecord['reviewStatus'],
): PredicateRegistryRecord {
  return {
    id,
    key,
    label: key,
    description: key,
    subjectEntityTypes: [],
    objectEntityTypes: [],
    attributeSchemaKey: null,
    vertical: null,
    aliases: [],
    examples: [],
    usageNotes: null,
    reviewStatus,
    replacementPredicateId: null,
    createdAt: now,
    updatedAt: now,
  };
}

function alias(
  id: string,
  predicateId: string,
  aliasText: string,
): PredicateRegistrySnapshot['aliases'][number] {
  return {
    id,
    predicateId,
    aliasText,
    normalizedAliasText: aliasText,
    language: null,
    vertical: null,
    confidence: 1,
    reviewStatus: 'approved',
    createdAt: now,
    updatedAt: now,
  };
}
