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
  market: JsonColumn<ExternalSeoMarket> | null;
  provider_statuses: JsonColumn<ExternalSeoEnrichmentPack['providerStatuses']>;
  warnings: JsonColumn<ExternalSeoEnrichmentPack['warnings']>;
  pack: JsonColumn<ExternalSeoEnrichmentPack>;
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
  market: JsonColumn<ExternalSeoMarket> | null;
  confidence: ExternalSeoObservation['confidence'];
  metadata: JsonColumn<ExternalSeoObservation['metadata']> | null;
  observation: JsonColumn<ExternalSeoObservation>;
  observed_at: Date | string | null;
  created_at: Date | string;
}

interface ExternalSeoMetricSnapshotRow {
  id: string;
  pack_id: string;
  provider_key: string;
  metric_name: ExternalSeoMetricSnapshot['metricName'];
  source_capability: ExternalSeoMetricSnapshot['sourceCapability'];
  value: JsonColumn<ExternalSeoMetricSnapshot['value']>;
  language: string | null;
  market: JsonColumn<ExternalSeoMarket> | null;
  confidence: ExternalSeoMetricSnapshot['confidence'];
  warning_codes: JsonColumn<string[]>;
  snapshot: JsonColumn<ExternalSeoMetricSnapshot>;
  fetched_at: Date | string | null;
  created_at: Date | string;
}

type JsonColumn<Value> = Value | string;

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
    market: jsonOrNull(command.pack.request.market),
    provider_statuses: json(command.pack.providerStatuses),
    warnings: json(command.pack.warnings),
    pack: json(command.pack),
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
    market: jsonOrNull(observation.market),
    confidence: observation.confidence,
    metadata: jsonOrNull(observation.metadata),
    observation: json(observation),
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
    value: json(snapshot.value),
    language: snapshot.language ?? null,
    market: jsonOrNull(snapshot.market),
    confidence: snapshot.confidence,
    warning_codes: json(snapshot.warningCodes),
    snapshot: json(snapshot),
    fetched_at: snapshot.fetchedAt,
    created_at: createdAt,
  };
}

function toPackRecord(
  row: ExternalSeoEnrichmentPackRow,
): ExternalSeoEnrichmentPackRecord {
  return {
    ...parseJson(row.pack),
    id: row.id,
    createdAt: toIsoString(row.created_at),
  };
}

function json<Value>(value: Value): string {
  return JSON.stringify(value);
}

function jsonOrNull<Value>(value: Value | null | undefined): string | null {
  return value === null || value === undefined ? null : json(value);
}

function parseJson<Value>(value: JsonColumn<Value>): Value {
  return typeof value === 'string' ? JSON.parse(value) as Value : value;
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export const __testing = {
  toPackRow,
  toPackRecord,
  toObservationRow,
  toMetricSnapshotRow,
};
