import { InMemorySerpIntelligenceRepository } from '../testing/in-memory-serp-intelligence.repository';
import { SerpSnapshot } from '../domain/serp-intelligence-types';
import { SerpPackService } from '../serp-pack.service';

describe('SerpIntelligenceRepository', () => {
  it('preserves snapshots and latest SERP Packs by query context', async () => {
    const repository = new InMemorySerpIntelligenceRepository();
    const snapshot = fixtureSnapshot();
    const pack = new SerpPackService().build({
      snapshot,
      pages: [],
    });

    await repository.saveSnapshot(snapshot);
    await repository.saveSerpPack({
      pack,
      createdAt: '2026-07-23T00:00:00.000Z',
    });

    expect(await repository.findSnapshot(snapshot.id)).toEqual(snapshot);
    await expect(
      repository.findLatestSerpPack({
        normalizedQuery: 'laser hair removal warsaw',
        topicId: 'topic-1',
      }),
    ).resolves.toMatchObject({
      id: 'serp-pack-1',
      normalizedQuery: 'laser hair removal warsaw',
      topicId: 'topic-1',
      createdAt: '2026-07-23T00:00:00.000Z',
    });
  });
});

function fixtureSnapshot(): SerpSnapshot {
  return {
    id: 'snapshot-1',
    query: 'Laser Hair Removal Warsaw',
    normalizedQuery: 'laser hair removal warsaw',
    topicId: 'topic-1',
    capturedAt: '2026-07-23T00:00:00.000Z',
    providerKey: 'manual',
    providerMode: 'manual_import',
    degraded: true,
    warnings: ['snapshot imported without processed pages'],
    results: [],
  };
}
