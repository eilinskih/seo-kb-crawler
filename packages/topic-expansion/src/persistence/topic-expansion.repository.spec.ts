import { ExpansionPackService } from '../expansion-pack.service';
import { InMemoryTopicExpansionRepository } from '../testing/in-memory-topic-expansion.repository';

describe('TopicExpansionRepository', () => {
  it('preserves the latest Expansion Pack by topic', async () => {
    const repository = new InMemoryTopicExpansionRepository();
    const pack = new ExpansionPackService().build({
      topicId: 'topic-1',
      topicLabel: 'Laser Hair Removal Poland',
      inputSignals: [],
    });

    await repository.saveExpansionPack({
      pack,
      createdAt: '2026-07-23T00:00:00.000Z',
    });

    await expect(repository.findLatestExpansionPack('topic-1')).resolves.toMatchObject({
      id: 'topic-expansion-pack-1',
      topicId: 'topic-1',
      createdAt: '2026-07-23T00:00:00.000Z',
    });
  });
});
