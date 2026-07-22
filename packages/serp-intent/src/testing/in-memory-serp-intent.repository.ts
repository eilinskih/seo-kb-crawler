import {
  SaveSerpIntentPackCommand,
  SerpIntentPackRecord,
  SerpIntentRepository,
} from '../persistence/serp-intent.repository';

export class InMemorySerpIntentRepository implements SerpIntentRepository {
  private readonly packs: SerpIntentPackRecord[] = [];

  async saveSerpIntentPack(
    command: SaveSerpIntentPackCommand,
  ): Promise<SerpIntentPackRecord> {
    const record = {
      ...command.pack,
      id: `serp-intent-pack-${this.packs.length + 1}`,
      createdAt: command.createdAt,
    };
    this.packs.push(record);
    return record;
  }

  async findLatestSerpIntentPack(options: {
    normalizedQuery: string;
    topicId?: string;
  }): Promise<SerpIntentPackRecord | null> {
    return (
      [...this.packs]
        .reverse()
        .find((pack) =>
          pack.normalizedQuery === options.normalizedQuery &&
          pack.topicId === options.topicId,
        ) ?? null
    );
  }
}
