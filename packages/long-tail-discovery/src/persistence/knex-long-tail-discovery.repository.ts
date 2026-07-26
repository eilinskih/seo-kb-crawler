import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import { SerpGeoTarget } from '@seo-kb/serp-intelligence';
import {
  LongTailDiscoveryPack,
} from '../domain/long-tail-discovery-types';
import {
  LongTailDiscoveryPackRecord,
  LongTailDiscoveryRepository,
  SaveLongTailDiscoveryPackCommand,
} from './long-tail-discovery.repository';

interface LongTailDiscoveryPackRow {
  id: string;
  topic_id: string;
  normalized_topic_label: string;
  language: string | null;
  language_key: string;
  geo: SerpGeoTarget;
  geo_key: string;
  source_pack_references: string[];
  dimensions: LongTailDiscoveryPack['dimensions'];
  combination_rules_applied: string[];
  opportunity_trees: LongTailDiscoveryPack['opportunityTrees'];
  candidates: LongTailDiscoveryPack['candidates'];
  pack: LongTailDiscoveryPack;
  degraded: boolean;
  warnings: string[];
  rule_version: string;
  created_at: Date | string;
}

@Injectable()
export class KnexLongTailDiscoveryRepository implements LongTailDiscoveryRepository {
  constructor(private readonly db: DbService) {}

  async saveDiscoveryPack(
    command: SaveLongTailDiscoveryPackCommand,
  ): Promise<LongTailDiscoveryPackRecord> {
    const row = toPackRow(command);
    await this.db.knex<LongTailDiscoveryPackRow>(
      'long_tail_discovery_packs',
    ).insert(row);

    return toPackRecord(row);
  }

  async findLatestDiscoveryPack(
    topicId: string,
  ): Promise<LongTailDiscoveryPackRecord | null> {
    const row = await this.db.knex<LongTailDiscoveryPackRow>(
      'long_tail_discovery_packs',
    )
      .where({ topic_id: topicId })
      .orderBy('created_at', 'desc')
      .first();

    return row ? toPackRecord(row) : null;
  }
}

function toPackRow(
  command: SaveLongTailDiscoveryPackCommand,
): LongTailDiscoveryPackRow {
  return {
    id: randomUUID(),
    topic_id: command.pack.topicId,
    normalized_topic_label: command.pack.normalizedTopicLabel,
    language: command.pack.language ?? null,
    language_key: languageKey(command.pack.language),
    geo: command.pack.geo ?? {},
    geo_key: geoKey(command.pack.geo),
    source_pack_references: command.pack.sourcePackReferences,
    dimensions: command.pack.dimensions,
    combination_rules_applied: command.pack.combinationRulesApplied,
    opportunity_trees: command.pack.opportunityTrees,
    candidates: command.pack.candidates,
    pack: command.pack,
    degraded: command.pack.degraded,
    warnings: command.pack.warnings,
    rule_version: command.pack.ruleVersion,
    created_at: command.createdAt,
  };
}

function toPackRecord(row: LongTailDiscoveryPackRow): LongTailDiscoveryPackRecord {
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
