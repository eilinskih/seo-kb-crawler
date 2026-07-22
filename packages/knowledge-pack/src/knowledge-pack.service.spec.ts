import { RetrievalResponse, RetrievalService } from '@seo-kb/retrieval';
import {
  KnowledgePackAliasRecord,
  KnowledgePackEntityRecord,
  KnowledgePackEntityTrustRecord,
  KnowledgePackFactRecord,
  KnowledgePackFactTrustRecord,
  KnowledgePackOntologyRecord,
  KnowledgePackRepository,
  KnowledgePackSourceTrustRecord,
} from './domain/knowledge-pack-types';
import { KnowledgePackService } from './knowledge-pack.service';

class InMemoryKnowledgePackRepository implements KnowledgePackRepository {
  facts: KnowledgePackFactRecord[] = [];
  entities: KnowledgePackEntityRecord[] = [];
  aliases: KnowledgePackAliasRecord[] = [];
  ontologyReferences: KnowledgePackOntologyRecord[] = [];
  sourceTrust: KnowledgePackSourceTrustRecord[] = [];
  factTrust: KnowledgePackFactTrustRecord[] = [];
  entityTrust: KnowledgePackEntityTrustRecord[] = [];

  async findCanonicalFactsByChunkIds(
    chunkIds: string[],
  ): Promise<KnowledgePackFactRecord[]> {
    return this.facts.filter((fact) => chunkIds.includes(fact.sourceChunkId));
  }

  async findEntitiesByIds(
    entityIds: string[],
  ): Promise<KnowledgePackEntityRecord[]> {
    return this.entities.filter((entity) => entityIds.includes(entity.entityId));
  }

  async findApprovedAliasesByEntityIds(
    entityIds: string[],
  ): Promise<KnowledgePackAliasRecord[]> {
    return this.aliases.filter((alias) => entityIds.includes(alias.entityId));
  }

  async findOntologyReferencesByPredicateIds(
    predicateIds: string[],
  ): Promise<KnowledgePackOntologyRecord[]> {
    return this.ontologyReferences.filter((reference) =>
      predicateIds.includes(reference.predicateId),
    );
  }

  async findSourceTrustByUrls(
    urls: string[],
  ): Promise<KnowledgePackSourceTrustRecord[]> {
    return this.sourceTrust.filter((trust) =>
      urls.includes(trust.sourceUrl) ||
      (trust.canonicalUrl ? urls.includes(trust.canonicalUrl) : false),
    );
  }

  async findFactTrustByFactIds(
    factIds: string[],
  ): Promise<KnowledgePackFactTrustRecord[]> {
    return this.factTrust.filter((trust) => factIds.includes(trust.factId));
  }

  async findEntityTrustByEntityIds(
    entityIds: string[],
  ): Promise<KnowledgePackEntityTrustRecord[]> {
    return this.entityTrust.filter((trust) => entityIds.includes(trust.entityId));
  }
}

describe('KnowledgePackService', () => {
  let retrievalResponse: RetrievalResponse;
  let repository: InMemoryKnowledgePackRepository;
  let service: KnowledgePackService;

  beforeEach(() => {
    retrievalResponse = {
      degraded: false,
      warnings: [],
      results: [
        {
          chunkId: 'chunk-1',
          documentId: 'doc-1',
          documentVersionId: 'doc-version-1',
          topicId: 'topic-1',
          score: 0.91,
          scoreBreakdown: {
            vector: 0.7,
            keyword: 0.6,
            metadata: 0.2,
            heading: 0.1,
            topic: 0.2,
            language: 0.1,
            geo: 0,
            chunkType: 0.1,
            diversity: 0.1,
          },
          matchedTerms: ['laser', 'price'],
          language: 'en',
          geoHints: [],
          sourceUrl: 'https://example.com/laser',
          canonicalUrl: 'https://example.com/laser',
          sourceDomain: 'example.com',
          headingPath: ['Laser hair removal'],
          sectionTitle: 'Prices',
          chunkType: 'section',
          text: 'Laser hair removal prices depend on treatment area.',
        },
        {
          chunkId: 'chunk-2',
          documentId: 'doc-2',
          documentVersionId: 'doc-version-2',
          topicId: 'topic-1',
          score: 0.87,
          scoreBreakdown: {
            vector: 0.5,
            keyword: 0.5,
            metadata: 0.2,
            heading: 0.1,
            topic: 0.2,
            language: 0.1,
            geo: 0,
            chunkType: 0.1,
            diversity: 0.1,
          },
          matchedTerms: ['laser'],
          language: 'en',
          geoHints: [],
          sourceUrl: 'https://clinic.test/laser',
          canonicalUrl: null,
          sourceDomain: 'clinic.test',
          headingPath: ['Treatment'],
          sectionTitle: null,
          chunkType: 'section',
          text: 'Clinics describe treatment areas and aftercare.',
        },
      ],
    };
    repository = new InMemoryKnowledgePackRepository();
    service = new KnowledgePackService(
      { search: jest.fn(async () => retrievalResponse) } as unknown as RetrievalService,
      repository,
    );
  });

  it('builds a deterministic pack with canonical facts as first-class objects', async () => {
    repository.facts = [
      {
        factId: 'fact-1',
        subjectEntityId: 'entity-1',
        objectEntityId: null,
        predicateId: 'predicate-1',
        predicateKey: 'has_price',
        normalizedAttributes: { currency: 'PLN' },
        sourceChunkId: 'chunk-1',
        confidence: 0.82,
        provenance: { extractor: 'test' },
      },
      {
        factId: 'fact-2',
        subjectEntityId: 'entity-1',
        objectEntityId: null,
        predicateId: 'predicate-1',
        predicateKey: 'has_price',
        normalizedAttributes: { currency: 'PLN' },
        sourceChunkId: 'chunk-2',
        confidence: 0.78,
        provenance: { extractor: 'test' },
      },
    ];
    repository.entities = [
      {
        entityId: 'entity-1',
        canonicalName: 'Laser hair removal',
        entityType: 'procedure',
        vertical: 'beauty',
        confidence: 0.9,
      },
    ];
    repository.aliases = [
      {
        aliasId: 'alias-1',
        entityId: 'entity-1',
        aliasText: 'laser hair removal',
        aliasType: 'canonical',
        language: 'en',
        confidence: 0.95,
      },
    ];
    repository.ontologyReferences = [
      {
        predicateId: 'predicate-1',
        predicateKey: 'has_price',
        label: 'Has price',
        description: 'Price information for an entity.',
      },
    ];

    const pack = await service.build({
      query: ' laser   hair removal price ',
      profile: 'article_generation',
      language: 'en',
    });

    expect(pack.normalizedQuery).toBe('laser hair removal price');
    expect(pack.facts).toEqual([
      expect.objectContaining({
        factId: 'fact-1',
        predicateKey: 'has_price',
        supportingChunkIds: ['chunk-1', 'chunk-2'],
        sourceIds: ['source-1', 'source-2'],
      }),
    ]);
    expect(pack.entities).toHaveLength(1);
    expect(pack.aliases).toHaveLength(1);
    expect(pack.ontologyReferences).toHaveLength(1);
    expect(pack.evidenceChunks.map((chunk) => chunk.chunkId)).toEqual([
      'chunk-1',
      'chunk-2',
    ]);
    expect(pack.sources.map((source) => source.id)).toEqual([
      'source-1',
      'source-2',
    ]);
    expect(pack.confidence.level).toBe('high');
  });

  it('surfaces missing canonical facts instead of fabricating knowledge', async () => {
    const pack = await service.build({
      query: 'laser hair removal',
      profile: 'content_planning',
    });

    expect(pack.facts).toEqual([]);
    expect(pack.confidence).toEqual({
      level: 'unknown',
      factCount: 0,
      sourceCount: 2,
      averageFactConfidence: null,
    });
    expect(pack.evidenceGaps).toContainEqual({
      code: 'no_canonical_facts',
      detail: 'No canonical facts were available for retrieved evidence chunks',
    });
  });

  it('propagates degraded retrieval as an evidence gap', async () => {
    retrievalResponse.degraded = true;
    retrievalResponse.warnings = ['vector search unavailable'];

    const pack = await service.build({
      query: 'laser hair removal',
      profile: 'fact_verification',
    });

    expect(pack.retrieval).toEqual({
      degraded: true,
      warnings: ['vector search unavailable'],
      resultCount: 2,
    });
    expect(pack.evidenceGaps).toContainEqual({
      code: 'retrieval_degraded',
      detail: 'vector search unavailable',
    });
  });

  it('filters aliases by requested language while keeping language-neutral aliases', async () => {
    repository.facts = [
      {
        factId: 'fact-1',
        subjectEntityId: 'entity-1',
        objectEntityId: null,
        predicateId: 'predicate-1',
        predicateKey: 'has_price',
        normalizedAttributes: {},
        sourceChunkId: 'chunk-1',
        confidence: 0.7,
        provenance: {},
      },
    ];
    repository.aliases = [
      {
        aliasId: 'alias-en',
        entityId: 'entity-1',
        aliasText: 'laser hair removal',
        aliasType: 'synonym',
        language: 'en',
        confidence: 0.9,
      },
      {
        aliasId: 'alias-pl',
        entityId: 'entity-1',
        aliasText: 'depilacja laserowa',
        aliasType: 'synonym',
        language: 'pl',
        confidence: 0.9,
      },
      {
        aliasId: 'alias-any',
        entityId: 'entity-1',
        aliasText: 'laser epilation',
        aliasType: 'synonym',
        language: null,
        confidence: 0.7,
      },
    ];

    const pack = await service.build({
      query: 'laser hair removal',
      profile: 'article_generation',
      language: 'pl',
    });

    expect(pack.aliases.map((alias) => alias.aliasId)).toEqual([
      'alias-pl',
      'alias-any',
    ]);
  });

  it('attaches optional trust metadata when score records are available', async () => {
    repository.facts = [
      {
        factId: 'fact-1',
        subjectEntityId: 'entity-1',
        objectEntityId: null,
        predicateId: 'predicate-1',
        predicateKey: 'has_price',
        normalizedAttributes: {},
        sourceChunkId: 'chunk-1',
        confidence: 0.7,
        provenance: {},
      },
    ];
    repository.entities = [
      {
        entityId: 'entity-1',
        canonicalName: 'Laser hair removal',
        entityType: 'procedure',
        vertical: 'beauty',
        confidence: 0.9,
      },
    ];
    repository.sourceTrust = [
      {
        sourceUrl: 'https://example.com/laser',
        canonicalUrl: 'https://example.com/laser',
        sourceType: 'official_documentation',
        reviewStatus: 'inferred',
        score: 0.86,
        ruleVersion: 'source-trust-default-v1',
        components: { baseScore: 0.9 },
      },
    ];
    repository.factTrust = [
      {
        factId: 'fact-1',
        evidenceStrengthScore: 0.72,
        sourceTrustScore: 0.86,
        extractionConfidence: 0.7,
        normalizationConfidence: 0.82,
        finalConfidence: 0.76,
        uncertaintyFlags: ['possible_conflict_unresolved'],
        components: { evidenceStrength: 0.72 },
      },
    ];
    repository.entityTrust = [
      {
        entityId: 'entity-1',
        aliasConfidence: 0.8,
        mentionCount: 4,
        sourceDiversityScore: 0.5,
        averageSourceTrust: 0.86,
        finalConfidence: 0.78,
        components: { mentionSupport: 0.2 },
      },
    ];

    const pack = await service.build({
      query: 'laser hair removal',
      profile: 'article_generation',
    });

    expect(pack.sources[0].trust).toEqual(expect.objectContaining({
      sourceType: 'official_documentation',
      score: 0.86,
    }));
    expect(pack.facts[0].trust).toEqual(expect.objectContaining({
      evidenceStrengthScore: 0.72,
      finalConfidence: 0.76,
    }));
    expect(pack.entities[0].trust).toEqual(expect.objectContaining({
      finalConfidence: 0.78,
    }));
    expect(pack.evidenceGaps).toContainEqual({
      code: 'possible_conflict_unresolved',
      detail: 'At least one fact has unresolved conflict uncertainty',
    });
  });
});
