import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  SeoPack,
  SeoPackGeoTarget,
} from '../domain/seo-pack-types';
import {
  SaveSeoPackCommand,
  SeoPackRecord,
  SeoPackRepository,
} from './seo-pack.repository';

interface SeoPackRow {
  id: string;
  topic_id: string;
  candidate_key: string;
  pack_key: string;
  page_type: SeoPack['pageType'];
  language: string | null;
  language_key: string;
  geo: SeoPackGeoTarget | string;
  geo_key: string;
  source_pack_references: SeoPack['sourcePackReferences'] | string;
  uncertainty: SeoPack['uncertainty'] | string;
  pack: SeoPack | string;
  degraded: boolean;
  warnings: string[] | string;
  rule_version: string;
  created_at: Date | string;
}

@Injectable()
export class KnexSeoPackRepository implements SeoPackRepository {
  constructor(private readonly db: DbService) {}

  async saveSeoPack(command: SaveSeoPackCommand): Promise<SeoPackRecord> {
    const row = toPackRow(command);
    await this.db.knex<SeoPackRow>('seo_packs').insert(row);

    return toPackRecord(row);
  }

  async findLatestSeoPack(
    topicId: string,
    candidateKey: string,
  ): Promise<SeoPackRecord | null> {
    const row = await this.db.knex<SeoPackRow>('seo_packs')
      .where({
        topic_id: topicId,
        candidate_key: candidateKey,
      })
      .orderBy('created_at', 'desc')
      .first();

    return row ? toPackRecord(row) : null;
  }

  async listSeoPacks(topicId: string): Promise<SeoPackRecord[]> {
    const rows = await this.db.knex<SeoPackRow>('seo_packs')
      .where({ topic_id: topicId })
      .orderBy('created_at', 'desc')
      .orderBy('candidate_key', 'asc');

    return rows.map(toPackRecord);
  }
}

function toPackRow(command: SaveSeoPackCommand): SeoPackRow {
  return {
    id: randomUUID(),
    topic_id: command.pack.topicId,
    candidate_key: command.pack.candidateKey,
    pack_key: command.pack.packKey,
    page_type: command.pack.pageType,
    language: command.pack.language ?? null,
    language_key: languageKey(command.pack.language),
    geo: serializeJson(command.pack.geo ?? {}),
    geo_key: geoKey(command.pack.geo),
    source_pack_references: serializeJson(command.pack.sourcePackReferences),
    uncertainty: serializeJson(command.pack.uncertainty),
    pack: serializeJson(command.pack),
    degraded: command.pack.degraded,
    warnings: serializeJson(command.pack.warnings),
    rule_version: command.pack.ruleVersion,
    created_at: command.createdAt,
  };
}

function toPackRecord(row: SeoPackRow): SeoPackRecord {
  return {
    ...parseJson(row.pack),
    id: row.id,
    createdAt: toIsoString(row.created_at),
  };
}

function geoKey(geo: SeoPackGeoTarget | undefined): string {
  return JSON.stringify({
    country: geo?.country ?? null,
    region: geo?.region ?? null,
    city: geo?.city ?? null,
  });
}

function languageKey(language: string | undefined): string {
  return language ?? 'unknown';
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value);
}

function parseJson<T>(value: T | string): T {
  return typeof value === 'string' ? JSON.parse(value) as T : value;
}

export const __testing = {
  toPackRow,
};
