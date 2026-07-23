import {
  LongTailDiscoveryPackRecord,
  LongTailDiscoveryRepository,
  SaveLongTailDiscoveryPackCommand,
} from '../persistence/long-tail-discovery.repository';

export class InMemoryLongTailDiscoveryRepository
  implements LongTailDiscoveryRepository
{
  private readonly packs: LongTailDiscoveryPackRecord[] = [];

  async saveDiscoveryPack(
    command: SaveLongTailDiscoveryPackCommand,
  ): Promise<LongTailDiscoveryPackRecord> {
    const record = {
      ...command.pack,
      id: `long-tail-discovery-pack-${this.packs.length + 1}`,
      createdAt: command.createdAt,
    };
    this.packs.push(record);
    return record;
  }

  async findLatestDiscoveryPack(
    topicId: string,
  ): Promise<LongTailDiscoveryPackRecord | null> {
    return [...this.packs].reverse().find((pack) => pack.topicId === topicId) ?? null;
  }
}
