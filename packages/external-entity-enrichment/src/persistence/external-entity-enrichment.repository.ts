import { ExternalEntityEnrichmentPack } from '../domain/external-entity-enrichment-types';

export interface SaveExternalEntityEnrichmentPackCommand {
  pack: ExternalEntityEnrichmentPack;
  createdAt: string;
}

export interface ExternalEntityEnrichmentPackRecord
  extends ExternalEntityEnrichmentPack {
  id: string;
  createdAt: string;
}

export interface ExternalEntityEnrichmentRepository {
  saveEnrichmentPack(
    command: SaveExternalEntityEnrichmentPackCommand,
  ): Promise<ExternalEntityEnrichmentPackRecord>;
  findLatestEnrichmentPack(
    entityName: string,
  ): Promise<ExternalEntityEnrichmentPackRecord | null>;
  listRecentEnrichmentPacks(
    limit: number,
  ): Promise<ExternalEntityEnrichmentPackRecord[]>;
}
