import { LongTailDiscoveryPackService } from '../long-tail-discovery-pack.service';
import { InMemoryLongTailDiscoveryRepository } from '../testing/in-memory-long-tail-discovery.repository';

describe('LongTailDiscoveryRepository', () => {
  it('preserves the latest Long-tail Discovery Pack by topic', async () => {
    const repository = new InMemoryLongTailDiscoveryRepository();
    const pack = new LongTailDiscoveryPackService().build({
      topicId: 'topic-1',
      topicLabel: 'Laser Hair Removal Poland',
      dimensionInputs: [],
    });

    await repository.saveDiscoveryPack({
      pack,
      createdAt: '2026-07-23T00:00:00.000Z',
    });

    await expect(repository.findLatestDiscoveryPack('topic-1')).resolves.toMatchObject({
      id: 'long-tail-discovery-pack-1',
      topicId: 'topic-1',
      createdAt: '2026-07-23T00:00:00.000Z',
    });
  });
});
