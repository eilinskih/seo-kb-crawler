import { DemandEngineService } from '../demand-engine.service';
import { ManualFallbackDemandProvider } from '../manual-fallback-demand.provider';
import { InMemoryDemandEngineRepository } from '../testing/in-memory-demand-engine.repository';

describe('DemandEngineRepository', () => {
  it('persists discovery results for reuse across runs', async () => {
    const repository = new InMemoryDemandEngineRepository();
    const service = new DemandEngineService([new ManualFallbackDemandProvider()]);
    const firstResult = await service.discover({
      topicId: 'topic-1',
      topicSeed: 'laser hair removal',
      manualSeeds: ['laser hair removal price'],
      language: 'en',
      geo: { countryCode: 'PL' },
    });

    await repository.saveDiscoveryResult({
      result: firstResult,
      topicId: 'topic-1',
      observedAt: '2026-07-26T00:00:00.000Z',
    });
    await repository.saveDiscoveryResult({
      result: firstResult,
      topicId: 'topic-1',
      observedAt: '2026-07-26T01:00:00.000Z',
    });

    await expect(repository.listKeywordCandidates('topic-1')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'demand-keyword-candidate-1',
          normalizedKeyword: 'laser hair removal',
          topicId: 'topic-1',
          metrics: expect.objectContaining({
            searchVolume: null,
            metricStatus: 'fallback_only',
            providerKey: 'manual_fallback',
          }),
          lastObservedAt: '2026-07-26T01:00:00.000Z',
          createdAt: '2026-07-26T00:00:00.000Z',
          updatedAt: '2026-07-26T01:00:00.000Z',
        }),
      ]),
    );
    await expect(repository.listCandidatePages('topic-1')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'demand-candidate-page-1',
          primaryKeyword: 'laser hair removal',
          missingMetrics: expect.arrayContaining(['searchVolume', 'cpc']),
        }),
      ]),
    );
  });
});
