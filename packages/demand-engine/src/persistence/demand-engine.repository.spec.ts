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

  it('removes stale keyword candidates when a later discovery recalculates the topic universe', async () => {
    const repository = new InMemoryDemandEngineRepository();
    const service = new DemandEngineService([new ManualFallbackDemandProvider()]);
    const firstResult = await service.discover({
      topicId: 'topic-1',
      topicSeed: 'laser hair removal',
      manualSeeds: ['laser hair removal price', 'laser hair removal thing'],
      language: 'en',
      geo: { countryCode: 'PL' },
    });
    const secondResult = await service.discover({
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
      result: secondResult,
      topicId: 'topic-1',
      observedAt: '2026-07-26T01:00:00.000Z',
    });

    await expect(repository.listKeywordCandidates('topic-1')).resolves.toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          normalizedKeyword: 'laser hair removal thing',
        }),
      ]),
    );
    await expect(repository.listKeywordCandidates('topic-1')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          normalizedKeyword: 'laser hair removal price',
        }),
      ]),
    );
  });

  it('rebuilds stale SERP evidence when later fallback refreshes recalculate pages', async () => {
    const repository = new InMemoryDemandEngineRepository();
    const service = new DemandEngineService([new ManualFallbackDemandProvider()]);
    const result = await service.discover({
      topicId: 'topic-1',
      topicSeed: 'laser hair removal',
      manualSeeds: ['laser hair removal price'],
      language: 'en',
      geo: { countryCode: 'PL' },
    });

    await repository.saveDiscoveryResult({
      result,
      topicId: 'topic-1',
      observedAt: '2026-07-26T00:00:00.000Z',
    });
    await repository.markCandidatePagesSerpValidated({
      topicId: 'topic-1',
      validatedAt: '2026-07-26T00:05:00.000Z',
      validations: [{
        query: 'laser hair removal',
        evidenceUrls: [
          'https://clinic.example/laser',
          'https://clinic.example/laser-cost',
          'https://clinic.example/laser-faq',
        ],
        evidenceQuality: 'strong',
      }],
    });
    const second = await repository.saveDiscoveryResult({
      result,
      topicId: 'topic-1',
      observedAt: '2026-07-26T01:00:00.000Z',
    });

    expect(second.candidatePages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        primaryKeyword: 'laser hair removal',
        readiness: 'partial',
        evidenceUrls: [],
        missingResearchGaps: expect.arrayContaining([
          'SERP validation evidence',
        ]),
      }),
    ]));

    await repository.markCandidatePagesSerpValidated({
      topicId: 'topic-1',
      validatedAt: '2026-07-26T01:05:00.000Z',
      validations: [{
        query: 'laser hair removal',
        evidenceUrls: [
          'https://clinic.example/laser',
          'https://clinic.example/laser-cost',
          'https://clinic.example/laser-faq',
        ],
        evidenceQuality: 'strong',
      }],
    });

    await expect(repository.listCandidatePages('topic-1')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          primaryKeyword: 'laser hair removal',
          readiness: 'ready',
          evidenceTypes: expect.arrayContaining(['serp_snippet']),
          evidenceUrls: [
            'https://clinic.example/laser',
            'https://clinic.example/laser-cost',
            'https://clinic.example/laser-faq',
          ],
          missingResearchGaps: expect.not.arrayContaining([
            'SERP validation evidence',
          ]),
        }),
      ]),
    );
  });

  it('does not promote weak SERP validation to ready', async () => {
    const repository = new InMemoryDemandEngineRepository();
    const service = new DemandEngineService([new ManualFallbackDemandProvider()]);
    const result = await service.discover({
      topicId: 'topic-1',
      topicSeed: 'laser hair removal',
      manualSeeds: ['laser hair removal price'],
      language: 'en',
      geo: { countryCode: 'PL' },
    });

    await repository.saveDiscoveryResult({
      result,
      topicId: 'topic-1',
      observedAt: '2026-07-26T00:00:00.000Z',
    });
    await repository.markCandidatePagesSerpValidated({
      topicId: 'topic-1',
      validatedAt: '2026-07-26T00:05:00.000Z',
      validations: [{
        query: 'laser hair removal',
        evidenceUrls: ['https://kfc.example/chicken'],
        evidenceQuality: 'weak',
      }],
    });

    await expect(repository.listCandidatePages('topic-1')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          primaryKeyword: 'laser hair removal',
          readiness: 'partial',
          missingResearchGaps: expect.arrayContaining([
            'Strong SERP relevance evidence',
          ]),
        }),
      ]),
    );
  });
});
