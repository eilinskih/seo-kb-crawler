import { Topic } from './domain/topic';
import { TopicConflictError } from './domain/topic-errors';
import { TopicSnapshot } from './domain/topic-types';
import { TopicRepository } from './persistence/topic.repository';
import { TopicService } from './topic.service';
import { validTopicInput } from './testing/topic.fixture';

describe('TopicService', () => {
  let repository: InMemoryTopicRepository;
  let service: TopicService;

  beforeEach(() => {
    repository = new InMemoryTopicRepository();
    service = new TopicService(repository);
  });

  it('persists initial and replacement snapshots', async () => {
    const created = await service.create(validTopicInput());
    const input = validTopicInput();

    const updated = await service.replaceConfiguration(created.id, {
      ...input,
      expectedConfigurationVersion: 1,
      crawlPolicy: { ...input.crawlPolicy, maxDepth: 4 },
    });

    expect(updated.configurationVersion).toBe(2);
    await expect(service.getSnapshot(created.id, 1)).resolves.toMatchObject({
      configurationVersion: 1,
    });
    await expect(service.getSnapshot(created.id, 2)).resolves.toMatchObject({
      configurationVersion: 2,
    });
  });

  it('supports the approved lifecycle', async () => {
    const created = await service.create(validTopicInput());

    await expect(service.activate(created.id)).resolves.toMatchObject({
      status: 'active',
    });
    await expect(service.pause(created.id)).resolves.toMatchObject({
      status: 'paused',
    });
    await expect(service.resume(created.id)).resolves.toMatchObject({
      status: 'active',
    });
    await expect(service.archive(created.id)).resolves.toMatchObject({
      status: 'archived',
    });
  });
});

class InMemoryTopicRepository implements TopicRepository {
  private readonly topics = new Map<string, Topic>();
  private readonly snapshots = new Map<string, TopicSnapshot>();

  create(topic: Topic, snapshot: TopicSnapshot): Promise<void> {
    if (
      [...this.topics.values()].some(
        (item) => item.toRecord().slug === topic.toRecord().slug,
      )
    ) {
      throw new TopicConflictError('Topic slug already exists');
    }
    this.topics.set(topic.toRecord().id, Topic.rehydrate(topic.toRecord()));
    this.saveSnapshot(snapshot);
    return Promise.resolve();
  }

  findById(id: string): Promise<Topic | null> {
    const topic = this.topics.get(id);
    return Promise.resolve(topic ? Topic.rehydrate(topic.toRecord()) : null);
  }

  list(): Promise<Topic[]> {
    return Promise.resolve(
      [...this.topics.values()].map((topic) =>
        Topic.rehydrate(topic.toRecord()),
      ),
    );
  }

  update(topic: Topic): Promise<void> {
    this.topics.set(topic.toRecord().id, Topic.rehydrate(topic.toRecord()));
    return Promise.resolve();
  }

  updateWithSnapshot(
    topic: Topic,
    snapshot: TopicSnapshot,
  ): Promise<void> {
    this.topics.set(topic.toRecord().id, Topic.rehydrate(topic.toRecord()));
    this.saveSnapshot(snapshot);
    return Promise.resolve();
  }

  findSnapshot(
    topicId: string,
    configurationVersion: number,
  ): Promise<TopicSnapshot | null> {
    return Promise.resolve(
      this.snapshots.get(`${topicId}:${configurationVersion}`) ?? null,
    );
  }

  private saveSnapshot(snapshot: TopicSnapshot): void {
    this.snapshots.set(
      `${snapshot.topicId}:${snapshot.configurationVersion}`,
      structuredClone(snapshot),
    );
  }
}
