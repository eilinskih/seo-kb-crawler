import {
  SaveSeoPackCommand,
  SeoPackRecord,
  SeoPackRepository,
} from '../persistence/seo-pack.repository';

export class InMemorySeoPackRepository implements SeoPackRepository {
  private readonly packs: SeoPackRecord[] = [];

  async saveSeoPack(command: SaveSeoPackCommand): Promise<SeoPackRecord> {
    const record = {
      ...command.pack,
      id: `seo-pack-${this.packs.length + 1}`,
      createdAt: command.createdAt,
    };
    this.packs.push(record);
    return record;
  }

  async findLatestSeoPack(
    topicId: string,
    candidateKey: string,
  ): Promise<SeoPackRecord | null> {
    return (
      [...this.packs]
        .reverse()
        .find(
          (pack) => pack.topicId === topicId && pack.candidateKey === candidateKey,
        ) ?? null
    );
  }

  async listSeoPacks(topicId: string): Promise<SeoPackRecord[]> {
    return [...this.packs]
      .filter((pack) => pack.topicId === topicId)
      .sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        left.candidateKey.localeCompare(right.candidateKey),
      );
  }
}
