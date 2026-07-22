import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  PredicateAliasResolution,
  PredicateAliasResolverService,
} from '@seo-kb/ontology';
import {
  FactExtractionProvider,
  FactExtractionProviderUnavailableError,
} from './domain/fact-extraction-provider';
import {
  DEFAULT_FACT_EXTRACTION_PROFILE,
} from './domain/fact-extraction-profiles';
import { selectFactExtractionCandidate } from './domain/candidate-selector';
import {
  CanonicalFactForStorage,
  ChunkForFactExtraction,
  FactExtractionFailure,
  FactExtractionProfile,
  FactExtractionRepository,
  FactExtractionResult,
  RawFactCandidate,
  RawFactForStorage,
  StoredCanonicalFactRecord,
} from './domain/fact-extraction-types';
import {
  FACT_EXTRACTION_PROVIDER,
  FACT_EXTRACTION_REPOSITORY,
} from './fact-extraction.tokens';

export interface ExtractFactsCommand {
  chunkIds: string[];
  now: Date;
  profile?: FactExtractionProfile;
}

@Injectable()
export class FactExtractionService {
  constructor(
    @Inject(FACT_EXTRACTION_REPOSITORY)
    private readonly repository: FactExtractionRepository,
    @Inject(FACT_EXTRACTION_PROVIDER)
    private readonly provider: FactExtractionProvider,
    private readonly predicateResolver: PredicateAliasResolverService,
  ) {}

  async findCandidates(options: {
    limit: number;
    profile?: FactExtractionProfile;
  }): Promise<ChunkForFactExtraction[]> {
    const profile = options.profile ?? DEFAULT_FACT_EXTRACTION_PROFILE;
    return this.repository.findExtractionCandidates({
      limit: options.limit,
      profile,
      provider: this.provider.identity,
    });
  }

  async extractBatch(command: ExtractFactsCommand): Promise<FactExtractionResult[]> {
    const profile = command.profile ?? DEFAULT_FACT_EXTRACTION_PROFILE;
    const chunks = await this.repository.findChunksByIds(command.chunkIds);
    const results: FactExtractionResult[] = [];

    for (const chunk of chunks) {
      results.push(await this.extractChunk(chunk, profile, command.now));
    }

    return results;
  }

  private async extractChunk(
    chunk: ChunkForFactExtraction,
    profile: FactExtractionProfile,
    now: Date,
  ): Promise<FactExtractionResult> {
    const identity = {
      chunkId: chunk.id,
      documentVersionId: chunk.documentVersionId,
      profileKey: profile.key,
      profileVersion: profile.version,
      providerKey: this.provider.identity.providerKey,
      modelKey: this.provider.identity.modelKey,
      modelVersion: this.provider.identity.modelVersion,
      chunkContentHash: chunk.contentHash,
    };
    const existingRun = await this.repository.findRun(identity);
    if (existingRun?.status === 'completed') {
      return {
        status: 'already_processed',
        runId: existingRun.id,
        rawFactCount: 0,
        canonicalFactCount: 0,
        rejectedCount: 0,
      };
    }

    const run = await this.repository.startRun(chunk, identity, { now });
    const decision = selectFactExtractionCandidate(chunk, profile);
    if (!decision.selected) {
      await this.repository.markRunSkipped(
        run,
        {
          category: 'low_value_chunk',
          detail: decision.skippedReason ?? 'Chunk was not selected',
          retryable: false,
        },
        { now },
      );
      return {
        status: 'skipped',
        runId: run.id,
        rawFactCount: 0,
        canonicalFactCount: 0,
        rejectedCount: 0,
      };
    }

    try {
      const providerResult = await this.provider.extractFacts({
        chunk,
        knownEntities: [],
        topicClassification: null,
        profile,
      });
      const outcome = await this.buildOutcome(
        run.id,
        chunk,
        providerResult.candidates,
        profile,
        now,
      );
      return this.repository.saveExtractionOutcome(run, outcome, { now });
    } catch (error) {
      const failure = failureFor(error);
      await this.repository.markRunFailed(run, failure, { now });
      return {
        status: failure.category === 'provider_unavailable'
          ? 'provider_unavailable'
          : 'failed',
        runId: run.id,
        rawFactCount: 0,
        canonicalFactCount: 0,
        rejectedCount: 0,
      };
    }
  }

  private async buildOutcome(
    extractionRunId: string,
    chunk: ChunkForFactExtraction,
    candidates: RawFactCandidate[],
    profile: FactExtractionProfile,
    now: Date,
  ): Promise<Parameters<FactExtractionRepository['saveExtractionOutcome']>[1]> {
    const rawFacts: RawFactForStorage[] = [];
    const canonicalFacts: CanonicalFactForStorage[] = [];
    const normalizationAttempts: Parameters<
      FactExtractionRepository['saveExtractionOutcome']
    >[1]['normalizationAttempts'] = [];

    for (const candidate of candidates) {
      const validationError = validateCandidate(candidate, profile);
      if (validationError) {
        normalizationAttempts.push({
          rawFactIndex: null,
          canonicalFactIndex: null,
          extractionRunId,
          predicateResolutionStatus: 'pending_review',
          predicateId: null,
          predicateAliasId: null,
          rejectionReason: validationError,
        });
        continue;
      }

      const rawFact = toRawFact(extractionRunId, chunk, candidate, this.provider.identity);
      const resolution = await this.predicateResolver.resolve({
        predicateCandidate: candidate.predicateCandidate,
        language: chunk.language ?? undefined,
      });
      const rawFactIndex = rawFacts.length;
      rawFacts.push(rawFact);

      const canonicalFact = toCanonicalFact(rawFact, resolution, profile, now);
      const canonicalFactIndex = canonicalFact ? canonicalFacts.length : null;
      normalizationAttempts.push({
        rawFactIndex,
        canonicalFactIndex,
        extractionRunId,
        predicateResolutionStatus: resolution.status,
        predicateId: resolution.predicate?.id ?? null,
        predicateAliasId: resolution.alias?.id ?? null,
        rejectionReason: canonicalFact ? null : resolution.reason,
      });
      if (canonicalFact) {
        canonicalFacts.push(canonicalFact);
      }
    }

    return {
      rawFacts,
      canonicalFacts,
      normalizationAttempts,
    };
  }
}

function validateCandidate(
  candidate: RawFactCandidate,
  profile: FactExtractionProfile,
): string | null {
  if (!candidate.subjectEntityId) {
    return 'Raw fact candidate is missing a known subject entity';
  }
  if (!candidate.predicateCandidate.trim()) {
    return 'Raw fact candidate is missing a predicate candidate';
  }
  if (candidate.objectCandidate === null || candidate.objectCandidate === undefined) {
    return 'Raw fact candidate is missing an object candidate';
  }
  if (!isPlainObject(candidate.attributesCandidate)) {
    return 'Raw fact candidate attributes must be a JSON object';
  }
  if (
    !Number.isFinite(candidate.confidence) ||
    candidate.confidence < 0 ||
    candidate.confidence > 1
  ) {
    return 'Raw fact candidate confidence must be between 0 and 1';
  }
  if (candidate.confidence < profile.minCandidateConfidence) {
    return 'Raw fact candidate confidence is below the profile threshold';
  }
  return null;
}

function toRawFact(
  extractionRunId: string,
  chunk: ChunkForFactExtraction,
  candidate: RawFactCandidate,
  extractionModel: RawFactForStorage['extractionModel'],
): RawFactForStorage {
  return {
    extractionRunId,
    subjectEntityId: candidate.subjectEntityId!,
    objectCandidate: candidate.objectCandidate,
    predicateCandidate: candidate.predicateCandidate,
    attributesCandidate: candidate.attributesCandidate,
    sourceChunkId: chunk.id,
    sourceDocumentVersionId: chunk.documentVersionId,
    extractionModel,
    confidence: candidate.confidence,
    fieldConfidence: candidate.fieldConfidence ?? {},
    evidenceText: candidate.evidenceText ?? null,
  };
}

function toCanonicalFact(
  rawFact: RawFactForStorage,
  resolution: PredicateAliasResolution,
  profile: FactExtractionProfile,
  now: Date,
): CanonicalFactForStorage | null {
  if (
    resolution.status !== 'resolved' ||
    !resolution.predicate ||
    rawFact.confidence < profile.minCanonicalConfidence
  ) {
    return null;
  }

  return {
    subjectEntityId: rawFact.subjectEntityId,
    objectEntityId: null,
    predicateId: resolution.predicate.id,
    normalizedAttributes: rawFact.attributesCandidate,
    sourceChunkId: rawFact.sourceChunkId,
    sourceDocumentVersionId: rawFact.sourceDocumentVersionId,
    confidence: rawFact.confidence,
    provenance: {
      extractionRunId: rawFact.extractionRunId,
      extractionModel: rawFact.extractionModel,
      predicateCandidate: rawFact.predicateCandidate,
      predicateAliasId: resolution.alias?.id ?? null,
      normalizedAt: now.toISOString(),
    },
  };
}

function failureFor(error: unknown): FactExtractionFailure {
  if (error instanceof FactExtractionProviderUnavailableError) {
    return {
      category: 'provider_unavailable',
      detail: error.message,
      retryable: true,
    };
  }
  return {
    category: 'provider_error',
    detail: error instanceof Error ? error.message : 'Unknown provider error',
    retryable: true,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function newFactId(): string {
  return randomUUID();
}
