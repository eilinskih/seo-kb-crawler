import { ExternalSeoEnrichmentPack } from '../domain/external-seo-data-provider-types';

export interface SaveExternalSeoEnrichmentPackCommand {
  pack: ExternalSeoEnrichmentPack;
  createdAt: string;
}

export interface ExternalSeoEnrichmentPackRecord
  extends ExternalSeoEnrichmentPack {
  id: string;
  createdAt: string;
}

export interface ExternalSeoDataProviderRepository {
  saveEnrichmentPack(
    command: SaveExternalSeoEnrichmentPackCommand,
  ): Promise<ExternalSeoEnrichmentPackRecord>;
  findLatestEnrichmentPack(
    topicId: string,
    query: string,
  ): Promise<ExternalSeoEnrichmentPackRecord | null>;
}
