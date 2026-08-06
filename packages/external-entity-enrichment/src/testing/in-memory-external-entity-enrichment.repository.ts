import {
  ExternalEntityReviewDecisionRecord,
} from '../domain/external-entity-enrichment-types';
import {
  ExternalEntityEnrichmentPackRecord,
  ExternalEntityEnrichmentRepository,
  SaveExternalEntityEnrichmentPackCommand,
  SaveExternalEntityReviewDecisionCommand,
} from '../persistence/external-entity-enrichment.repository';

export class InMemoryExternalEntityEnrichmentRepository
implements ExternalEntityEnrichmentRepository {
  private readonly records: ExternalEntityEnrichmentPackRecord[] = [];
  private readonly reviewDecisions: ExternalEntityReviewDecisionRecord[] = [];

  async saveEnrichmentPack(
    command: SaveExternalEntityEnrichmentPackCommand,
  ): Promise<ExternalEntityEnrichmentPackRecord> {
    const record: ExternalEntityEnrichmentPackRecord = {
      ...command.pack,
      id: `external-entity-pack-${this.records.length + 1}`,
      createdAt: command.createdAt,
    };
    this.records.push(record);
    return record;
  }

  async findLatestEnrichmentPack(
    entityName: string,
  ): Promise<ExternalEntityEnrichmentPackRecord | null> {
    return [...this.records]
      .reverse()
      .find((record) => record.request.entityName === entityName) ?? null;
  }

  async listRecentEnrichmentPacks(
    limit: number,
  ): Promise<ExternalEntityEnrichmentPackRecord[]> {
    return [...this.records]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, limit);
  }

  async findEnrichmentPackById(
    attemptId: string,
  ): Promise<ExternalEntityEnrichmentPackRecord | null> {
    return this.records.find((record) => record.id === attemptId) ?? null;
  }

  async saveReviewDecision(
    command: SaveExternalEntityReviewDecisionCommand,
  ): Promise<ExternalEntityReviewDecisionRecord> {
    this.reviewDecisions.push(command.decision);
    return command.decision;
  }

  async listRecentReviewDecisions(
    limit: number,
  ): Promise<ExternalEntityReviewDecisionRecord[]> {
    return [...this.reviewDecisions]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, limit);
  }
}
