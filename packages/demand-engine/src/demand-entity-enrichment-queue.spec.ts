import { DemandEntityEnrichmentDispatchService } from './demand-entity-enrichment-queue';
import { DemandDiscoveryResult } from './domain/demand-engine-types';
import { DemandDiscoveryPersistenceResult } from './persistence/demand-engine.repository';

describe('DemandEntityEnrichmentDispatchService', () => {
  it('queues persisted candidates without entity evidence using stable job ids', async () => {
    const queue = {
      add: jest.fn(async () => undefined),
    };
    const service = new DemandEntityEnrichmentDispatchService(queue as never);

    const count = await service.dispatch({
      topicSeed: 'szafka garażowa',
      topicId: 'topic-1',
      discovery: discoveryResult(),
      persistence: persistenceResult(),
      queuedAt: '2026-08-21T00:00:00.000Z',
    });

    expect(count).toBe(1);
    expect(queue.add).toHaveBeenCalledWith(
      'external-entity-enrichment',
      expect.objectContaining({
        topicId: 'topic-1',
        topicSeed: 'szafka garażowa',
        keywordCandidateId: 'candidate-1',
        normalizedKeyword: 'szafka garażowa z szufladami',
        candidateUpdatedAt: '2026-08-21T00:00:00.000Z',
      }),
      expect.objectContaining({
        jobId: [
          'demand-entity-enrichment',
          'candidate-1',
          '2026-08-21T00:00:00.000Z',
        ].join(':'),
      }),
    );
  });
});

function discoveryResult(): DemandDiscoveryResult {
  return {
    normalizedTopic: 'szafka garażowa',
    fallbackMode: false,
    warnings: [],
    observations: [],
    candidatePages: [],
    keywordCandidates: [{
      normalizedKeyword: 'szafka garażowa z szufladami',
      observedTexts: ['szafka garażowa z szufladami'],
      language: 'pl',
      sourceTiers: ['owned_data'],
      providers: ['topic_work_evidence'],
      evidenceTypes: ['competitor_heading'],
      confidence: 'medium',
      metrics: unknownMetrics(),
      phraseAnalysis: {
        providerKey: 'self_hosted_nlp_phrase_analysis',
        candidateKind: 'page_cluster',
        confidence: 'medium',
        entityEvidence: [],
        reasons: [],
      },
    }, {
      normalizedKeyword: 'already enriched',
      observedTexts: ['already enriched'],
      sourceTiers: ['owned_data'],
      providers: ['topic_work_evidence'],
      evidenceTypes: ['competitor_heading'],
      confidence: 'medium',
      metrics: unknownMetrics(),
      phraseAnalysis: {
        providerKey: 'entity_enriched_phrase_analysis',
        candidateKind: 'page_cluster',
        confidence: 'medium',
        entityEvidence: [{
          text: 'already enriched',
          providerKey: 'wikidata',
          externalId: 'Q1',
          name: 'Already Enriched',
          types: ['Thing'],
          confidence: 'high',
        }],
        reasons: [],
      },
    }],
  };
}

function persistenceResult(): DemandDiscoveryPersistenceResult {
  return {
    observations: [],
    metricSnapshots: [],
    candidatePages: [],
    keywordCandidates: [{
      ...discoveryResult().keywordCandidates[0],
      id: 'candidate-1',
      topicId: 'topic-1',
      lastObservedAt: '2026-08-21T00:00:00.000Z',
      createdAt: '2026-08-21T00:00:00.000Z',
      updatedAt: '2026-08-21T00:00:00.000Z',
    }, {
      ...discoveryResult().keywordCandidates[1],
      id: 'candidate-2',
      topicId: 'topic-1',
      lastObservedAt: '2026-08-21T00:00:00.000Z',
      createdAt: '2026-08-21T00:00:00.000Z',
      updatedAt: '2026-08-21T00:00:00.000Z',
    }],
  };
}

function unknownMetrics() {
  return {
    searchVolume: null,
    keywordDifficulty: null,
    cpc: null,
    trafficPotential: null,
    trend: null,
    seasonality: null,
    metricStatus: 'unknown' as const,
    providerKey: null,
    collectedAt: null,
  };
}
