import { DemandDiscoveryPersistenceService } from './demand-discovery-persistence.service';
import { DemandMetricVisibilityService } from './demand-metric-visibility.service';
import { DemandDiscoveryResult } from './domain/demand-engine-types';
import { ManualFallbackDemandProvider } from './manual-fallback-demand.provider';
import { InMemoryDemandEngineRepository } from './testing/in-memory-demand-engine.repository';

describe('DemandMetricVisibilityService', () => {
  it('reports fallback-only candidates as unknown demand metrics', async () => {
    const repository = new InMemoryDemandEngineRepository();
    await new DemandDiscoveryPersistenceService(
      repository,
      [new ManualFallbackDemandProvider()],
    ).discoverAndPersist({
      topicId: 'topic-1',
      topicSeed: 'laser hair removal',
      manualSeeds: ['laser hair removal price'],
      observedAt: '2026-07-26T00:00:00.000Z',
    });

    const report = await new DemandMetricVisibilityService(repository).report({
      topicId: 'topic-1',
      observedAt: '2026-07-26T00:00:00.000Z',
    });

    expect(report.unknownMetricCount).toBeGreaterThan(0);
    expect(report.staleMetricCount).toBe(0);
    expect(report.items[0]).toMatchObject({
      normalizedKeyword: 'laser hair removal',
      metricStatus: 'fallback_only',
      visibilityStatus: 'unknown_metrics',
      missingMetrics: expect.arrayContaining([
        'searchVolume',
        'keywordDifficulty',
        'cpc',
        'trafficPotential',
      ]),
    });
  });

  it('reports old provider-backed candidates as stale demand metrics', async () => {
    const repository = new InMemoryDemandEngineRepository();
    await repository.saveDiscoveryResult({
      result: providerBackedDiscoveryResult(),
      topicId: 'topic-1',
      observedAt: '2026-07-26T00:00:00.000Z',
    });

    const report = await new DemandMetricVisibilityService(repository).report({
      topicId: 'topic-1',
      observedAt: '2026-07-26T00:00:00.000Z',
      staleAfterHours: 24,
    });

    expect(report.unknownMetricCount).toBe(0);
    expect(report.staleMetricCount).toBe(1);
    expect(report.items).toEqual([
      expect.objectContaining({
        normalizedKeyword: 'laser hair removal cost',
        candidatePageSlug: '/laser-hair-removal-cost/',
        metricStatus: 'provider_backed',
        providerKey: 'test_paid',
        collectedAt: '2026-07-20T00:00:00.000Z',
        missingMetrics: [],
        visibilityStatus: 'stale_metrics',
      }),
    ]);
  });

  it('can include fresh provider-backed candidates for complete operator reports', async () => {
    const repository = new InMemoryDemandEngineRepository();
    await repository.saveDiscoveryResult({
      result: providerBackedDiscoveryResult('2026-07-26T00:00:00.000Z'),
      topicId: 'topic-1',
      observedAt: '2026-07-26T00:00:00.000Z',
    });

    const report = await new DemandMetricVisibilityService(repository).report({
      topicId: 'topic-1',
      observedAt: '2026-07-26T00:00:00.000Z',
      staleAfterHours: 24,
      includeFresh: true,
    });

    expect(report).toMatchObject({
      unknownMetricCount: 0,
      staleMetricCount: 0,
      freshMetricCount: 1,
    });
    expect(report.items[0]).toMatchObject({
      visibilityStatus: 'fresh_metrics',
    });
  });
});

function providerBackedDiscoveryResult(
  collectedAt = '2026-07-20T00:00:00.000Z',
): DemandDiscoveryResult {
  return {
    normalizedTopic: 'laser hair removal',
    fallbackMode: false,
    warnings: [],
    observations: [{
      observedText: 'laser hair removal cost',
      sourceTier: 'paid_provider',
      providerKey: 'test_paid',
      evidenceType: 'provider_keyword_metric',
      sourceQuery: 'laser hair removal',
      metrics: {
        searchVolume: 1000,
        keywordDifficulty: 22,
        cpc: 3.5,
        trafficPotential: 1200,
        trend: 1,
        seasonality: 'stable',
        metricStatus: 'provider_backed',
        providerKey: 'test_paid',
        collectedAt,
      },
    }],
    keywordCandidates: [{
      normalizedKeyword: 'laser hair removal cost',
      observedTexts: ['laser hair removal cost'],
      sourceTiers: ['paid_provider'],
      providers: ['test_paid'],
      evidenceTypes: ['provider_keyword_metric'],
      confidence: 'high',
      metrics: {
        searchVolume: 1000,
        keywordDifficulty: 22,
        cpc: 3.5,
        trafficPotential: 1200,
        trend: 1,
        seasonality: 'stable',
        metricStatus: 'provider_backed',
        providerKey: 'test_paid',
        collectedAt,
      },
    }],
    candidatePages: [{
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
        trend: 1,
        seasonality: 'stable',
        metricStatus: 'provider_backed',
        providerKey: 'test_paid',
        collectedAt,
      },
      missingMetrics: [],
      pageAction: 'new',
    }],
  };
}
