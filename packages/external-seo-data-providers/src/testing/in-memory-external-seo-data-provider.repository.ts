import {
  ExternalSeoDataProviderRepository,
  ExternalSeoEnrichmentPackRecord,
  SaveExternalSeoEnrichmentPackCommand,
} from '../persistence/external-seo-data-provider.repository';

export class InMemoryExternalSeoDataProviderRepository
  implements ExternalSeoDataProviderRepository {
  private readonly records: ExternalSeoEnrichmentPackRecord[] = [];

  async saveEnrichmentPack(
    command: SaveExternalSeoEnrichmentPackCommand,
  ): Promise<ExternalSeoEnrichmentPackRecord> {
    const record = {
      ...command.pack,
      id: `external-seo-pack-${this.records.length + 1}`,
      createdAt: command.createdAt,
    };
    this.records.push(record);
    return record;
  }

  async findLatestEnrichmentPack(
    topicId: string,
    query: string,
  ): Promise<ExternalSeoEnrichmentPackRecord | null> {
    return [...this.records].reverse().find((record) =>
      record.request.topicId === topicId && record.request.query === query,
    ) ?? null;
  }
}
