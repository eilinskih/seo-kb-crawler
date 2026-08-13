import {
  __focusedSerpDiscoveryTesting,
  FocusedSerpDiscoveryService,
} from './focused-serp-discovery.service';
import { SerpIntelligenceRepository } from './persistence/serp-intelligence.repository';

describe('FocusedSerpDiscoveryService', () => {
  it('records a bounded SERP snapshot and creates URL Frontier observations', async () => {
    const repository = repositoryDouble();
    const service = new FocusedSerpDiscoveryService(repository);

    const result = await service.recordSnapshot({
      topicId: 'topic-1',
      topicConfigurationVersion: 2,
      query: 'Depilacja laserowa Jasło',
      language: 'pl',
      geo: { countryCode: 'PL', city: 'Jasło' },
      providerKey: 'manual_test',
      results: [
        {
          url: 'HTTPS://Example.com/depilacja#section',
          title: 'Depilacja laserowa Jasło',
          snippet: 'Oferta lokalna.',
        },
      ],
      capturedAt: '2026-08-13T00:00:00.000Z',
    });

    expect(repository.saveSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      normalizedQuery: 'depilacja laserowa jasło',
      providerMode: 'manual_import',
      results: [
        expect.objectContaining({
          position: 1,
          url: 'https://example.com/depilacja',
          domain: 'example.com',
        }),
      ],
    }));
    expect(result.observations).toEqual([
      expect.objectContaining({
        topicId: 'topic-1',
        topicConfigurationVersion: 2,
        sourceType: 'search',
        discoveredUrl: 'https://example.com/depilacja',
        sourceRank: 1,
        idempotencyKey: expect.stringMatching(/^[a-f0-9]{64}$/u),
        metadata: expect.objectContaining({
          normalizedQuery: 'depilacja laserowa jasło',
        }),
      }),
    ]);
  });

  it('limits imported SERP results to the top 10', () => {
    const snapshot = __focusedSerpDiscoveryTesting.toSnapshot({
      topicId: 'topic-1',
      topicConfigurationVersion: 1,
      query: 'laser jasło',
      results: Array.from({ length: 12 }, (_, index) => ({
        url: `https://example-${index + 1}.com/`,
      })),
    });

    expect(snapshot.results).toHaveLength(10);
    expect(snapshot.results.map((result) => result.position)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });
});

function repositoryDouble(): SerpIntelligenceRepository {
  return {
    saveSnapshot: jest.fn(async () => undefined),
    findSnapshot: jest.fn(),
    saveSerpPack: jest.fn(),
    findLatestSerpPack: jest.fn(),
  } as unknown as SerpIntelligenceRepository;
}
