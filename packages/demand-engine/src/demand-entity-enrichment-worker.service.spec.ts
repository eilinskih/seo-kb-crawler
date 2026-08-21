import { ExternalEntityEnrichmentService } from '@seo-kb/external-entity-enrichment';
import { DemandEntityEnrichmentWorkerService } from './demand-entity-enrichment-worker.service';
import {
  DemandEngineRepository,
  DemandKeywordCandidateRecord,
} from './persistence/demand-engine.repository';

describe('DemandEntityEnrichmentWorkerService', () => {
  it('uses the latest candidate version when an older job is processed', async () => {
    const repository = fakeRepository({
      updatedAt: '2026-08-21T00:01:00.000Z',
    });
    const entityEnrichment = fakeEntityEnrichment();
    const service = new DemandEntityEnrichmentWorkerService(
      repository,
      entityEnrichment,
    );

    const result = await service.process({
      topicId: 'topic-1',
      topicSeed: 'szafka garażowa',
      keywordCandidateId: 'candidate-1',
      normalizedKeyword: 'szafka garażowa z szufladami',
      language: 'pl',
      evidenceTypes: ['competitor_heading'],
      candidateUpdatedAt: '2026-08-21T00:00:00.000Z',
      queuedAt: '2026-08-21T00:00:00.000Z',
    });

    expect(result.status).toBe('applied');
    expect(entityEnrichment.enrich).toHaveBeenCalled();
    expect(repository.applyPhraseAnalysisToKeywordCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        keywordCandidateId: 'candidate-1',
        candidateUpdatedAt: '2026-08-21T00:01:00.000Z',
      }),
    );
  });

  it('applies entity evidence back to the persisted candidate', async () => {
    const repository = fakeRepository();
    const entityEnrichment = fakeEntityEnrichment();
    const service = new DemandEntityEnrichmentWorkerService(
      repository,
      entityEnrichment,
    );

    const result = await service.process({
      topicId: 'topic-1',
      topicSeed: 'szafka garażowa',
      keywordCandidateId: 'candidate-1',
      normalizedKeyword: 'szafka garażowa z szufladami',
      language: 'pl',
      evidenceTypes: ['competitor_heading'],
      candidateUpdatedAt: '2026-08-21T00:00:00.000Z',
      queuedAt: '2026-08-21T00:00:00.000Z',
    });

    expect(result.status).toBe('applied');
    expect(repository.applyPhraseAnalysisToKeywordCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        keywordCandidateId: 'candidate-1',
        candidateUpdatedAt: '2026-08-21T00:00:00.000Z',
        externalEntityAttemptId: 'attempt-1',
        phraseAnalysis: expect.objectContaining({
          providerKey: 'entity_enriched_phrase_analysis',
          entityEvidence: expect.arrayContaining([
            expect.objectContaining({
              providerKey: 'wikidata',
              externalId: 'Q1',
            }),
          ]),
        }),
      }),
    );
  });
});

function fakeRepository(
  overrides: Partial<DemandKeywordCandidateRecord> = {},
): jest.Mocked<DemandEngineRepository> {
  const candidate: DemandKeywordCandidateRecord = {
    id: 'candidate-1',
    topicId: 'topic-1',
    normalizedKeyword: 'szafka garażowa z szufladami',
    observedTexts: ['szafka garażowa z szufladami'],
    language: 'pl',
    sourceTiers: ['owned_data'],
    providers: ['topic_work_evidence'],
    evidenceTypes: ['competitor_heading'],
    confidence: 'medium',
    metrics: {
      searchVolume: null,
      keywordDifficulty: null,
      cpc: null,
      trafficPotential: null,
      trend: null,
      seasonality: null,
      metricStatus: 'unknown',
      providerKey: null,
      collectedAt: null,
    },
    lastObservedAt: '2026-08-21T00:00:00.000Z',
    createdAt: '2026-08-21T00:00:00.000Z',
    updatedAt: '2026-08-21T00:00:00.000Z',
    ...overrides,
  };

  return {
    saveDiscoveryResult: jest.fn(),
    markCandidatePagesSerpValidated: jest.fn(),
    listKeywordCandidates: jest.fn(),
    listCandidatePages: jest.fn(),
    findKeywordCandidateById: jest.fn(async (_keywordCandidateId: string) =>
      candidate,
    ),
    applyPhraseAnalysisToKeywordCandidate: jest.fn(async (_command) =>
      candidate,
    ),
  };
}

function fakeEntityEnrichment(): jest.Mocked<ExternalEntityEnrichmentService> {
  return {
    enrich: jest.fn(async (request) => ({
      request,
      generatedAt: '2026-08-21T00:00:00.000Z',
      degraded: false,
      providerStatuses: [],
      warnings: [],
      candidates: [{
        providerKey: 'wikidata',
        source: 'wikidata',
        externalId: 'Q1',
        externalIdType: 'wikidata_qid',
        name: request.entityName,
        description: null,
        types: ['Thing'],
        aliases: [],
        urls: [],
        score: 120,
        confidence: 'high',
        provenance: {
          providerKey: 'wikidata',
          source: 'wikidata',
          observedAt: '2026-08-21T00:00:00.000Z',
        },
      }],
      externalIds: [],
    })),
    findLatestPack: jest.fn(async () => ({
      id: 'attempt-1',
      createdAt: '2026-08-21T00:00:00.000Z',
      request: {
        entityName: 'szafka garażowa z szufladami',
      },
      generatedAt: '2026-08-21T00:00:00.000Z',
      degraded: false,
      providerStatuses: [],
      warnings: [],
      candidates: [],
      externalIds: [],
    })),
  } as unknown as jest.Mocked<ExternalEntityEnrichmentService>;
}
