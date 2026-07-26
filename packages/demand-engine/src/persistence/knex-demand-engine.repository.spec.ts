import { __testing, KnexDemandEngineRepository } from './knex-demand-engine.repository';
import {
  CandidatePage,
  DemandObservation,
} from '../domain/demand-engine-types';

describe('KnexDemandEngineRepository', () => {
  it('can be constructed with the database boundary', () => {
    const repository = new KnexDemandEngineRepository({} as never);

    expect(repository).toBeInstanceOf(KnexDemandEngineRepository);
  });

  it('maps topic keys into durable observation and candidate page rows', () => {
    const observation: DemandObservation = {
      observedText: 'laser hair removal cost',
      sourceTier: 'paid_provider',
      providerKey: 'test_paid',
      evidenceType: 'provider_keyword_metric',
      sourceQuery: 'laser hair removal',
    };
    const page: CandidatePage = {
      slug: '/laser-hair-removal-cost/',
      primaryKeyword: 'laser hair removal cost',
      supportingKeywords: [],
      proposedPageType: 'guide',
      confidence: 'high',
      evidenceTypes: ['provider_keyword_metric'],
      metrics: {
        searchVolume: 1000,
        keywordDifficulty: 22,
        cpc: 3.5,
        trafficPotential: 1200,
        trend: null,
        seasonality: null,
        metricStatus: 'provider_backed',
        providerKey: 'test_paid',
        collectedAt: '2026-07-26T00:00:00.000Z',
      },
      missingMetrics: [],
      pageAction: 'new',
    };

    expect(
      __testing.toObservationRow(
        observation,
        'keyword-candidate-1',
        'topic-1',
        '2026-07-26T00:00:00.000Z',
      ),
    ).toMatchObject({
      topic_id: 'topic-1',
      topic_key: 'topic-1',
    });
    expect(
      __testing.toCandidatePageRow(
        page,
        'keyword-candidate-1',
        'topic-1',
        '2026-07-26T00:00:00.000Z',
      ),
    ).toMatchObject({
      topic_id: 'topic-1',
      topic_key: 'topic-1',
    });
  });
});
