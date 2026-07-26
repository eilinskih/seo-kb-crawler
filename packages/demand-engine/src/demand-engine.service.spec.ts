import { DemandEngineService } from './demand-engine.service';
import { DemandDiscoveryPersistenceService } from './demand-discovery-persistence.service';
import {
  DemandProviderAdapter,
  DemandProviderResult,
} from './domain/demand-engine-types';
import { ExternalSeoDemandProvider } from './external-seo-demand.provider';
import { ManualFallbackDemandProvider } from './manual-fallback-demand.provider';
import { InMemoryDemandEngineRepository } from './testing/in-memory-demand-engine.repository';

describe('DemandEngineService', () => {
  it('continues in fallback mode without paid provider data', async () => {
    const service = new DemandEngineService([
      unavailableProvider(),
      new ManualFallbackDemandProvider(),
    ]);

    const result = await service.discover({
      topicSeed: 'laser hair removal',
      manualSeeds: ['Laser hair removal', 'laser hair removal price'],
      language: 'en',
      geo: { countryCode: 'PL' },
    });

    expect(result.fallbackMode).toBe(true);
    expect(result.warnings).toEqual([
      'paid_provider unavailable: missing API key',
    ]);
    expect(result.keywordCandidates[0]).toMatchObject({
      normalizedKeyword: 'laser hair removal',
      confidence: 'low',
      metrics: expect.objectContaining({
        searchVolume: null,
        keywordDifficulty: null,
        cpc: null,
        metricStatus: 'fallback_only',
      }),
    });
    expect(result.candidatePages[0]).toMatchObject({
      slug: '/laser-hair-removal/',
      primaryKeyword: 'laser hair removal',
      missingMetrics: expect.arrayContaining([
        'searchVolume',
        'keywordDifficulty',
        'cpc',
      ]),
    });
  });

  it('uses provider-backed metrics when available without requiring them', async () => {
    const service = new DemandEngineService([
      {
        providerKey: 'test_paid',
        sourceTier: 'paid_provider',
        async discover(): Promise<DemandProviderResult> {
          return {
            observations: [{
              observedText: 'laser hair removal cost',
              sourceTier: 'paid_provider',
              providerKey: 'test_paid',
              evidenceType: 'related_search',
              sourceQuery: 'laser hair removal',
              metrics: {
                searchVolume: 1000,
                keywordDifficulty: 22,
                cpc: 3.5,
                trafficPotential: 1200,
                metricStatus: 'provider_backed',
                collectedAt: '2026-07-23T00:00:00.000Z',
              },
            }],
          };
        },
      },
      new ManualFallbackDemandProvider(),
    ]);

    const result = await service.discover({
      topicSeed: 'laser hair removal',
    });

    expect(result.fallbackMode).toBe(false);
    expect(result.keywordCandidates[0]).toMatchObject({
      normalizedKeyword: 'laser hair removal cost',
      confidence: 'high',
      metrics: expect.objectContaining({
        searchVolume: 1000,
        metricStatus: 'provider_backed',
      }),
    });
  });

  it('discovers and persists fallback-safe demand results', async () => {
    const repository = new InMemoryDemandEngineRepository();
    const result = await new DemandDiscoveryPersistenceService(
      repository,
      [unavailableProvider(), new ManualFallbackDemandProvider()],
    ).discoverAndPersist({
      topicId: 'topic-1',
      topicSeed: 'laser hair removal',
      manualSeeds: ['laser hair removal price'],
      observedAt: '2026-07-26T00:00:00.000Z',
    });

    expect(result.discovery).toMatchObject({
      fallbackMode: true,
      warnings: ['paid_provider unavailable: missing API key'],
    });
    expect(result.persistence.keywordCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        topicId: 'topic-1',
        normalizedKeyword: 'laser hair removal',
        metrics: expect.objectContaining({
          searchVolume: null,
          metricStatus: 'fallback_only',
        }),
      }),
    ]));
    await expect(repository.listKeywordCandidates('topic-1')).resolves.not.toEqual([]);
  });

  it('maps External SEO provider metrics into provider-backed demand observations', async () => {
    const service = new DemandEngineService([
      new ExternalSeoDemandProvider({
        enrich: jest.fn(async () => ({
          request: { topicSeed: 'laser hair removal' },
          generatedAt: '2026-07-26T00:00:00.000Z',
          degraded: false,
          providerStatuses: [],
          warnings: [],
          observations: [{
            observationType: 'keyword',
            providerKey: 'test_paid',
            sourceCapability: 'keyword_intelligence',
            subject: 'laser hair removal cost',
            metrics: [
              metric('search_volume', 1000),
              metric('keyword_difficulty', 22),
              metric('cpc', 3.5),
              metric('traffic_potential', 1200),
            ],
            confidence: 'high',
            observedAt: '2026-07-26T00:00:00.000Z',
          }],
          metricSnapshots: [],
        })),
      } as never),
      new ManualFallbackDemandProvider(),
    ]);

    const result = await service.discover({
      topicSeed: 'laser hair removal',
    });

    expect(result.fallbackMode).toBe(false);
    expect(result.keywordCandidates[0]).toMatchObject({
      normalizedKeyword: 'laser hair removal cost',
      confidence: 'high',
      metrics: expect.objectContaining({
        searchVolume: 1000,
        keywordDifficulty: 22,
        cpc: 3.5,
        trafficPotential: 1200,
        metricStatus: 'provider_backed',
        providerKey: 'test_paid',
      }),
    });
  });

  it('continues with fallback when External SEO provider returns no observations', async () => {
    const service = new DemandEngineService([
      new ExternalSeoDemandProvider({
        enrich: jest.fn(async () => ({
          request: { topicSeed: 'laser hair removal' },
          generatedAt: '2026-07-26T00:00:00.000Z',
          degraded: true,
          providerStatuses: [],
          warnings: [{
            providerKey: 'paid_provider',
            status: 'misconfigured',
            code: 'missing_api_key',
            message: 'missing API key',
          }],
          observations: [],
          metricSnapshots: [],
        })),
      } as never),
      new ManualFallbackDemandProvider(),
    ]);

    const result = await service.discover({
      topicSeed: 'laser hair removal',
      manualSeeds: ['laser hair removal price'],
    });

    expect(result.fallbackMode).toBe(true);
    expect(result.warnings).toEqual(['paid_provider: missing API key']);
    expect(result.keywordCandidates[0]).toMatchObject({
      metrics: expect.objectContaining({
        searchVolume: null,
        metricStatus: 'fallback_only',
      }),
    });
  });
});

function unavailableProvider(): DemandProviderAdapter {
  return {
    providerKey: 'paid_provider',
    sourceTier: 'paid_provider',
    async discover(): Promise<DemandProviderResult> {
      throw new Error('missing API key');
    },
  };
}

function metric(metricName: string, value: number | string | null) {
  return {
    metricName,
    value,
    providerKey: 'test_paid',
    sourceCapability: 'keyword_intelligence',
    fetchedAt: '2026-07-26T00:00:00.000Z',
    confidence: 'high',
    warningCodes: [],
  };
}
