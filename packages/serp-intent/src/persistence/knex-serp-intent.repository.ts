import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import { SerpGeoTarget } from '@seo-kb/serp-intelligence';
import {
  SerpIntentPack,
} from '../domain/serp-intent-types';
import {
  SaveSerpIntentPackCommand,
  SerpIntentPackRecord,
  SerpIntentRepository,
} from './serp-intent.repository';

interface SerpIntentPackRow {
  id: string;
  topic_id: string | null;
  topic_key: string;
  normalized_query: string;
  language: string | null;
  language_key: string;
  geo: SerpGeoTarget;
  geo_key: string;
  source_snapshot_ids: string[];
  pack: SerpIntentPack;
  degraded: boolean;
  warnings: string[];
  rule_version: string;
  created_at: Date | string;
}

@Injectable()
export class KnexSerpIntentRepository implements SerpIntentRepository {
  constructor(private readonly db: DbService) {}

  async saveSerpIntentPack(
    command: SaveSerpIntentPackCommand,
  ): Promise<SerpIntentPackRecord> {
    const row = toPackRow(command);
    await this.db.knex<SerpIntentPackRow>('serp_intent_packs').insert(row);

    return toPackRecord(row);
  }

  async findLatestSerpIntentPack(options: {
    normalizedQuery: string;
    topicId?: string;
  }): Promise<SerpIntentPackRecord | null> {
    const row = await this.db.knex<SerpIntentPackRow>('serp_intent_packs')
      .where({
        topic_key: topicKey(options.topicId),
        normalized_query: options.normalizedQuery,
      })
      .orderBy('created_at', 'desc')
      .first();

    return row ? toPackRecord(row) : null;
  }
}

function toPackRow(command: SaveSerpIntentPackCommand): SerpIntentPackRow {
  return {
    id: randomUUID(),
    topic_id: command.pack.topicId ?? null,
    topic_key: topicKey(command.pack.topicId),
    normalized_query: command.pack.normalizedQuery,
    language: command.pack.language ?? null,
    language_key: languageKey(command.pack.language),
    geo: command.pack.geo ?? {},
    geo_key: geoKey(command.pack.geo),
    source_snapshot_ids: command.pack.sourceSnapshotIds,
    pack: command.pack,
    degraded: command.pack.degraded,
    warnings: command.pack.warnings,
    rule_version: command.pack.ruleVersion,
    created_at: command.createdAt,
  };
}

function toPackRecord(row: SerpIntentPackRow): SerpIntentPackRecord {
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
};
