import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  EntityExternalIdSignal,
  ExternalEntityEnrichmentPack,
  ExternalEntityProviderDescriptor,
} from '../domain/external-entity-enrichment-types';
import {
  ExternalEntityEnrichmentPackRecord,
  ExternalEntityEnrichmentRepository,
  SaveExternalEntityEnrichmentPackCommand,
} from './external-entity-enrichment.repository';

interface ExternalEntitySourceRow {
  provider_key: string;
  tier: ExternalEntityProviderDescriptor['tier'];
  capabilities: ExternalEntityProviderDescriptor['capabilities'];
  status: ExternalEntityProviderDescriptor['status'];
  metadata: Record<string, unknown>;
  created_at: Date | string;
  updated_at: Date | string;
}

interface EntityEnrichmentAttemptRow {
  id: string;
  entity_id: string | null;
  entity_name: string;
  entity_type: string | null;
  vertical: string | null;
  language: string | null;
  geo: ExternalEntityEnrichmentPack['request']['geo'] | Record<string, never>;
  status: 'completed' | 'failed_open';
  degraded: boolean;
  request: ExternalEntityEnrichmentPack['request'];
  provider_statuses: ExternalEntityEnrichmentPack['providerStatuses'];
  warnings: ExternalEntityEnrichmentPack['warnings'];
  candidates: ExternalEntityEnrichmentPack['candidates'];
  started_at: Date | string;
  completed_at: Date | string;
  created_at: Date | string;
}

interface EntityExternalIdRow {
  id: string;
  entity_id: string | null;
  provider_key: string;
  external_id: string;
  external_id_type: string;
  confidence: EntityExternalIdSignal['confidence'];
  source_url: string | null;
  latest_attempt_id: string | null;
  metadata: Record<string, unknown>;
  observed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

@Injectable()
export class KnexExternalEntityEnrichmentRepository
  implements ExternalEntityEnrichmentRepository
{
  constructor(private readonly db: DbService) {}

  async saveEnrichmentPack(
    command: SaveExternalEntityEnrichmentPackCommand,
  ): Promise<ExternalEntityEnrichmentPackRecord> {
    const packId = randomUUID();
    const sourceRows = command.pack.providerStatuses.map((status) =>
      toSourceRow(status, command.createdAt),
    );
    const attemptRow = toAttemptRow(command, packId);
    const externalIdRows = command.pack.externalIds.map((signal) =>
      toExternalIdRow(
        signal,
        command.pack.request.entityId ?? null,
        packId,
        command.createdAt,
      ),
    );

    await this.db.knex.transaction(async (trx) => {
      if (sourceRows.length > 0) {
        await trx<ExternalEntitySourceRow>('external_entity_sources')
          .insert(sourceRows)
          .onConflict('provider_key')
          .merge([
            'tier',
            'capabilities',
            'status',
            'metadata',
            'updated_at',
          ]);
      }

      await trx<EntityEnrichmentAttemptRow>(
        'entity_enrichment_attempts',
      ).insert(attemptRow);

      if (externalIdRows.length > 0) {
        await trx<EntityExternalIdRow>('entity_external_ids')
          .insert(externalIdRows)
          .onConflict(['provider_key', 'external_id', 'external_id_type'])
          .merge([
            'entity_id',
            'confidence',
            'source_url',
            'latest_attempt_id',
            'metadata',
            'observed_at',
            'updated_at',
          ]);
      }
    });

    return toPackRecord(attemptRow, command.pack.externalIds);
  }

  async findLatestEnrichmentPack(
    entityName: string,
  ): Promise<ExternalEntityEnrichmentPackRecord | null> {
    const row = await this.db.knex<EntityEnrichmentAttemptRow>(
      'entity_enrichment_attempts',
    )
      .where({ entity_name: entityName })
      .orderBy('created_at', 'desc')
      .first();

    if (!row) {
      return null;
    }

    const externalIdRows = await this.db.knex<EntityExternalIdRow>(
      'entity_external_ids',
    ).where({ latest_attempt_id: row.id });

    return toPackRecord(row, externalIdRows.map(toExternalIdSignal));
  }
}

function toSourceRow(
  status: ExternalEntityProviderDescriptor,
  timestamp: string,
): ExternalEntitySourceRow {
  return {
    provider_key: status.providerKey,
    tier: status.tier,
    capabilities: status.capabilities,
    status: status.status,
    metadata: {
      warningCodes: (status.warnings ?? []).map((warning) => warning.code),
    },
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function toAttemptRow(
  command: SaveExternalEntityEnrichmentPackCommand,
  id = randomUUID(),
): EntityEnrichmentAttemptRow {
  const request = command.pack.request;

  return {
    id,
    entity_id: request.entityId ?? null,
    entity_name: request.entityName,
    entity_type: request.entityType ?? null,
    vertical: request.vertical ?? null,
    language: request.language ?? null,
    geo: request.geo ?? {},
    status: command.pack.degraded ? 'failed_open' : 'completed',
    degraded: command.pack.degraded,
    request,
    provider_statuses: command.pack.providerStatuses,
    warnings: command.pack.warnings,
    candidates: command.pack.candidates,
    started_at: command.pack.generatedAt,
    completed_at: command.pack.generatedAt,
    created_at: command.createdAt,
  };
}

function toExternalIdRow(
  signal: EntityExternalIdSignal,
  entityId: string | null,
  attemptId: string,
  timestamp: string,
): EntityExternalIdRow {
  return {
    id: randomUUID(),
    entity_id: entityId,
    provider_key: signal.providerKey,
    external_id: signal.externalId,
    external_id_type: signal.externalIdType,
    confidence: signal.confidence,
    source_url: signal.sourceUrl ?? null,
    latest_attempt_id: attemptId,
    metadata: {},
    observed_at: signal.observedAt,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function toPackRecord(
  row: EntityEnrichmentAttemptRow,
  externalIds: EntityExternalIdSignal[],
): ExternalEntityEnrichmentPackRecord {
  return {
    request: row.request,
    generatedAt: toIsoString(row.completed_at),
    degraded: row.degraded,
    providerStatuses: row.provider_statuses,
    warnings: row.warnings,
    candidates: row.candidates,
    externalIds,
    id: row.id,
    createdAt: toIsoString(row.created_at),
  };
}

function toExternalIdSignal(row: EntityExternalIdRow): EntityExternalIdSignal {
  return {
    providerKey: row.provider_key,
    externalId: row.external_id,
    externalIdType: row.external_id_type,
    confidence: row.confidence,
    sourceUrl: row.source_url,
    observedAt: row.observed_at ? toIsoString(row.observed_at) : null,
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export const __testing = {
  toAttemptRow,
  toExternalIdRow,
  toExternalIdSignal,
  toPackRecord,
  toSourceRow,
};
