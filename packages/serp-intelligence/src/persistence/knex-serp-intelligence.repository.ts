import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  SerpGeoTarget,
  SerpPack,
  SerpSnapshot,
} from '../domain/serp-intelligence-types';
import {
  SaveSerpPackCommand,
  SerpIntelligenceRepository,
  SerpPackRecord,
} from './serp-intelligence.repository';

interface SerpSnapshotRow {
  id: string;
  topic_id: string | null;
  topic_key: string;
  query: string;
  normalized_query: string;
  language: string | null;
  language_key: string;
  geo: SerpGeoTarget;
  geo_key: string;
  captured_at: Date | string;
  provider_key: string;
  provider_mode: SerpSnapshot['providerMode'];
  degraded: boolean;
  warnings: string[];
  results: SerpSnapshot['results'];
  snapshot: SerpSnapshot;
  created_at: Date | string;
  updated_at: Date | string;
}

interface SerpPackRow {
  id: string;
  topic_id: string | null;
  topic_key: string;
  normalized_query: string;
  language: string | null;
  language_key: string;
  geo: SerpGeoTarget;
  geo_key: string;
  snapshot_ids: string[];
  pack: SerpPack;
  degraded: boolean;
  warnings: string[];
  rule_version: string;
  created_at: Date | string;
}

@Injectable()
export class KnexSerpIntelligenceRepository
  implements SerpIntelligenceRepository
{
  constructor(private readonly db: DbService) {}

  async saveSnapshot(snapshot: SerpSnapshot): Promise<void> {
    const existing = await this.db.knex<SerpSnapshotRow>('serp_snapshots')
      .where({ id: snapshot.id })
      .first();
    const row = toSnapshotRow(snapshot, existing);

    await this.db.knex<SerpSnapshotRow>('serp_snapshots')
      .insert(row)
      .onConflict('id')
      .merge({
        topic_id: row.topic_id,
        topic_key: row.topic_key,
        query: row.query,
        normalized_query: row.normalized_query,
        language: row.language,
        language_key: row.language_key,
        geo: row.geo,
        geo_key: row.geo_key,
        captured_at: row.captured_at,
        provider_key: row.provider_key,
        provider_mode: row.provider_mode,
        degraded: row.degraded,
        warnings: row.warnings,
        results: row.results,
        snapshot: row.snapshot,
        updated_at: row.updated_at,
      });
  }

  async findSnapshot(snapshotId: string): Promise<SerpSnapshot | null> {
    const row = await this.db.knex<SerpSnapshotRow>('serp_snapshots')
      .where({ id: snapshotId })
      .first();

    return row ? row.snapshot : null;
  }

  async saveSerpPack(command: SaveSerpPackCommand): Promise<SerpPackRecord> {
    const row = toPackRow(command);
    await this.db.knex<SerpPackRow>('serp_packs').insert(row);

    return toPackRecord(row);
  }

  async findLatestSerpPack(options: {
    normalizedQuery: string;
    topicId?: string;
  }): Promise<SerpPackRecord | null> {
    const row = await this.db.knex<SerpPackRow>('serp_packs')
      .where({
        topic_key: topicKey(options.topicId),
        normalized_query: options.normalizedQuery,
      })
      .orderBy('created_at', 'desc')
      .first();

    return row ? toPackRecord(row) : null;
  }
}

function toSnapshotRow(
  snapshot: SerpSnapshot,
  existing?: SerpSnapshotRow,
): SerpSnapshotRow {
  const createdAt = existing?.created_at ?? snapshot.capturedAt;
  return {
    id: snapshot.id,
    topic_id: snapshot.topicId ?? null,
    topic_key: topicKey(snapshot.topicId),
    query: snapshot.query,
    normalized_query: snapshot.normalizedQuery,
    language: snapshot.language ?? null,
    language_key: languageKey(snapshot.language),
    geo: snapshot.geo ?? {},
    geo_key: geoKey(snapshot.geo),
    captured_at: snapshot.capturedAt,
    provider_key: snapshot.providerKey,
    provider_mode: snapshot.providerMode,
    degraded: snapshot.degraded,
    warnings: snapshot.warnings,
    results: snapshot.results,
    snapshot,
    created_at: createdAt,
    updated_at: snapshot.capturedAt,
  };
}

function toPackRow(command: SaveSerpPackCommand): SerpPackRow {
  return {
    id: randomUUID(),
    topic_id: command.pack.topicId ?? null,
    topic_key: topicKey(command.pack.topicId),
    normalized_query: command.pack.normalizedQuery,
    language: command.pack.language ?? null,
    language_key: languageKey(command.pack.language),
    geo: command.pack.geo ?? {},
    geo_key: geoKey(command.pack.geo),
    snapshot_ids: command.pack.snapshotIds,
    pack: command.pack,
    degraded: command.pack.degraded,
    warnings: command.pack.warnings,
    rule_version: command.pack.ruleVersion,
    created_at: command.createdAt,
  };
}

function toPackRecord(row: SerpPackRow): SerpPackRecord {
  return {
    ...row.pack,
    id: row.id,
    createdAt: toIsoString(row.created_at),
  };
}

function geoKey(geo: SerpGeoTarget | undefined): string {
  return JSON.stringify({
    countryCode: geo?.countryCode ?? null,
    regionCode: geo?.regionCode ?? null,
    city: geo?.city ?? null,
  });
}

function topicKey(topicId: string | undefined): string {
  return topicId ?? 'global';
}

function languageKey(language: string | undefined): string {
  return language ?? 'unknown';
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export const __testing = {
  toPackRow,
  toSnapshotRow,
};
