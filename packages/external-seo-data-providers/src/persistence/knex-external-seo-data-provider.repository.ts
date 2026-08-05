import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  ExternalSeoEnrichmentPack,
  ExternalSeoMarket,
  ExternalSeoMetricSnapshot,
  ExternalSeoObservation,
} from '../domain/external-seo-data-provider-types';
import {
  ExternalSeoDataProviderRepository,
  ExternalSeoEnrichmentPackRecord,
  SaveExternalSeoEnrichmentPackCommand,
} from './external-seo-data-provider.repository';

interface ExternalSeoEnrichmentPackRow {
  id: string;
  topic_id: string | null;
  query: string | null;
  topic_seed: string | null;
  language: string | null;
  market: ExternalSeoMarket | null;
  provider_statuses: ExternalSeoEnrichmentPack['providerStatuses'];
  warnings: ExternalSeoEnrichmentPack['warnings'];
  pack: ExternalSeoEnrichmentPack;
  degraded: boolean;
  generated_at: Date | string;
  created_at: Date | string;
}

interface ExternalSeoObservationRow {
  id: string;
  pack_id: string;
  provider_key: string;
  observation_type: ExternalSeoObservation['observationType'];
  source_capability: ExternalSeoObservation['sourceCapability'];
  subject: string;
  url: string | null;
  language: string | null;
  market: ExternalSeoMarket | null;
  confidence: ExternalSeoObservation['confidence'];
  metadata: ExternalSeoObservation['metadata'] | null;
  observation: ExternalSeoObservation;
  observed_at: Date | string | null;
  created_at: Date | string;
}

interface ExternalSeoMetricSnapshotRow {
  id: string;
  pack_id: string;
  provider_key: string;
  metric_name: ExternalSeoMetricSnapshot['metricName'];
  source_capability: ExternalSeoMetricSnapshot['sourceCapability'];
  value: ExternalSeoMetricSnapshot['value'];
  language: string | null;
  market: ExternalSeoMarket | null;
  confidence: ExternalSeoMetricSnapshot['confidence'];
  warning_codes: string[];
  snapshot: ExternalSeoMetricSnapshot;
  fetched_at: Date | string | null;
  created_at: Date | string;
}

@Injectable()
export class KnexExternalSeoDataProviderRepository
  implements ExternalSeoDataProviderRepository
{
  constructor(private readonly db: DbService) {}

  async saveEnrichmentPack(
    command: SaveExternalSeoEnrichmentPackCommand,
  ): Promise<ExternalSeoEnrichmentPackRecord> {
    const packId = randomUUID();
    const packRow = toPackRow(command, packId);
    const observationRows = command.pack.observations.map((observation) =>
      toObservationRow(observation, packId, command.createdAt),
    );
    const metricRows = command.pack.metricSnapshots.map((snapshot) =>
      toMetricSnapshotRow(snapshot, packId, command.createdAt),
    );

    await this.db.knex.transaction(async (trx) => {
      await trx<ExternalSeoEnrichmentPackRow>(
        'external_seo_enrichment_packs',
      ).insert(packRow);

      if (observationRows.length > 0) {
        await trx<ExternalSeoObservationRow>(
          'external_seo_observations',
        ).insert(observationRows);
      }

      if (metricRows.length > 0) {
        await trx<ExternalSeoMetricSnapshotRow>(
          'external_seo_metric_snapshots',
        ).insert(metricRows);
      }
    });

    return toPackRecord(packRow);
  }

  async findLatestEnrichmentPack(
    topicId: string,
    query: string,
  ): Promise<ExternalSeoEnrichmentPackRecord | null> {
    const row = await this.db.knex<ExternalSeoEnrichmentPackRow>(
      'external_seo_enrichment_packs',
    )
      .where({
        topic_id: topicId,
        query,
      })
      .orderBy('created_at', 'desc')
      .first();

    return row ? toPackRecord(row) : null;
  }
}

function toPackRow(
  command: SaveExternalSeoEnrichmentPackCommand,
  id = randomUUID(),
): ExternalSeoEnrichmentPackRow {
  return {
    id,
    topic_id: command.pack.request.topicId ?? null,
    query: command.pack.request.query ?? null,
    topic_seed: command.pack.request.topicSeed ?? null,
    language: command.pack.request.language ?? null,
    market: command.pack.request.market ?? null,
    provider_statuses: command.pack.providerStatuses,
    warnings: command.pack.warnings,
    pack: command.pack,
    degraded: command.pack.degraded,
    generated_at: command.pack.generatedAt,
    created_at: command.createdAt,
  };
}

function toObservationRow(
  observation: ExternalSeoObservation,
  packId: string,
  createdAt: string,
): ExternalSeoObservationRow {
  return {
    id: randomUUID(),
    pack_id: packId,
    provider_key: observation.providerKey,
    observation_type: observation.observationType,
    source_capability: observation.sourceCapability,
    subject: observation.subject,
    url: observation.url ?? null,
    language: observation.language ?? null,
    market: observation.market ?? null,
    confidence: observation.confidence,
    metadata: observation.metadata ?? null,
    observation,
    observed_at: observation.observedAt,
    created_at: createdAt,
  };
}

function toMetricSnapshotRow(
  snapshot: ExternalSeoMetricSnapshot,
  packId: string,
  createdAt: string,
): ExternalSeoMetricSnapshotRow {
  return {
    id: randomUUID(),
    pack_id: packId,
    provider_key: snapshot.providerKey,
    metric_name: snapshot.metricName,
    source_capability: snapshot.sourceCapability,
    value: snapshot.value,
    language: snapshot.language ?? null,
    market: snapshot.market ?? null,
    confidence: snapshot.confidence,
    warning_codes: snapshot.warningCodes,
    snapshot,
    fetched_at: snapshot.fetchedAt,
    created_at: createdAt,
  };
}

function toPackRecord(
  row: ExternalSeoEnrichmentPackRow,
): ExternalSeoEnrichmentPackRecord {
  return {
    ...row.pack,
    id: row.id,
    createdAt: toIsoString(row.created_at),
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export const __testing = {
  toPackRow,
  toObservationRow,
  toMetricSnapshotRow,
};
