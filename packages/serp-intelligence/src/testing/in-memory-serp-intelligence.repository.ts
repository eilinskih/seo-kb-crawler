import {
  SaveSerpPackCommand,
  SerpIntelligenceRepository,
  SerpPackRecord,
} from '../persistence/serp-intelligence.repository';
import { SerpSnapshot } from '../domain/serp-intelligence-types';

export class InMemorySerpIntelligenceRepository
  implements SerpIntelligenceRepository
{
  private readonly snapshots = new Map<string, SerpSnapshot>();
  private readonly packs: SerpPackRecord[] = [];

  async saveSnapshot(snapshot: SerpSnapshot): Promise<void> {
    this.snapshots.set(snapshot.id, snapshot);
  }

  async findSnapshot(snapshotId: string): Promise<SerpSnapshot | null> {
    return this.snapshots.get(snapshotId) ?? null;
  }

  async saveSerpPack(command: SaveSerpPackCommand): Promise<SerpPackRecord> {
    const record = {
      ...command.pack,
      id: `serp-pack-${this.packs.length + 1}`,
      createdAt: command.createdAt,
    };
    this.packs.push(record);
    return record;
  }

  async findLatestSerpPack(options: {
    normalizedQuery: string;
    topicId?: string;
  }): Promise<SerpPackRecord | null> {
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
