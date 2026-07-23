import {
  SaveTopicExpansionPackCommand,
  TopicExpansionPackRecord,
  TopicExpansionRepository,
} from '../persistence/topic-expansion.repository';

export class InMemoryTopicExpansionRepository
  implements TopicExpansionRepository
{
  private readonly packs: TopicExpansionPackRecord[] = [];

  async saveExpansionPack(
    command: SaveTopicExpansionPackCommand,
  ): Promise<TopicExpansionPackRecord> {
    const record = {
      ...command.pack,
      id: `topic-expansion-pack-${this.packs.length + 1}`,
      createdAt: command.createdAt,
    };
    this.packs.push(record);
    return record;
  }

  async findLatestExpansionPack(
    topicId: string,
  ): Promise<TopicExpansionPackRecord | null> {
    return [...this.packs].reverse().find((pack) => pack.topicId === topicId) ?? null;
  }
}
