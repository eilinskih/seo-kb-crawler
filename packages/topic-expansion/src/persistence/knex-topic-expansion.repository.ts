import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import { SerpGeoTarget } from '@seo-kb/serp-intelligence';
import {
  TopicExpansionPack,
} from '../domain/topic-expansion-types';
import {
  SaveTopicExpansionPackCommand,
  TopicExpansionPackRecord,
  TopicExpansionRepository,
} from './topic-expansion.repository';

interface TopicExpansionPackRow {
  id: string;
  topic_id: string;
  normalized_topic_label: string;
  language: string | null;
  language_key: string;
  geo: SerpGeoTarget;
  geo_key: string;
  source_pack_references: string[];
  clusters: TopicExpansionPack['clusters'];
  candidates: TopicExpansionPack['candidates'];
  pack: TopicExpansionPack;
  degraded: boolean;
  warnings: string[];
  rule_version: string;
  created_at: Date | string;
}

@Injectable()
export class KnexTopicExpansionRepository implements TopicExpansionRepository {
  constructor(private readonly db: DbService) {}

  async saveExpansionPack(
    command: SaveTopicExpansionPackCommand,
  ): Promise<TopicExpansionPackRecord> {
    const row = toPackRow(command);
    await this.db.knex<TopicExpansionPackRow>('topic_expansion_packs').insert(row);

    return toPackRecord(row);
  }

  async findLatestExpansionPack(
    topicId: string,
  ): Promise<TopicExpansionPackRecord | null> {
    const row = await this.db.knex<TopicExpansionPackRow>(
      'topic_expansion_packs',
    )
      .where({ topic_id: topicId })
      .orderBy('created_at', 'desc')
      .first();

    return row ? toPackRecord(row) : null;
  }
}

function toPackRow(command: SaveTopicExpansionPackCommand): TopicExpansionPackRow {
  return {
    id: randomUUID(),
    topic_id: command.pack.topicId,
    normalized_topic_label: command.pack.normalizedTopicLabel,
    language: command.pack.language ?? null,
    language_key: languageKey(command.pack.language),
    geo: command.pack.geo ?? {},
    geo_key: geoKey(command.pack.geo),
    source_pack_references: command.pack.sourcePackReferences,
    clusters: command.pack.clusters,
    candidates: command.pack.candidates,
    pack: command.pack,
    degraded: command.pack.degraded,
    warnings: command.pack.warnings,
    rule_version: command.pack.ruleVersion,
    created_at: command.createdAt,
  };
}

function toPackRecord(row: TopicExpansionPackRow): TopicExpansionPackRecord {
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

function languageKey(language: string | undefined): string {
  return language ?? 'unknown';
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export const __testing = {
  toPackRow,
};
