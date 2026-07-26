import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import { SerpGeoTarget } from '@seo-kb/serp-intelligence';
import {
  CandidateScoringPack,
} from '../domain/seo-candidate-scoring-types';
import {
  CandidateScoringPackRecord,
  SaveCandidateScoringPackCommand,
  SeoCandidateScoringRepository,
} from './seo-candidate-scoring.repository';

interface CandidateScoringPackRow {
  id: string;
  topic_id: string;
  profile: CandidateScoringPack['profile'];
  language: string | null;
  language_key: string;
  geo: SerpGeoTarget;
  geo_key: string;
  scored_candidates: CandidateScoringPack['scoredCandidates'];
  pack: CandidateScoringPack;
  degraded: boolean;
  warnings: string[];
  rule_version: string;
  created_at: Date | string;
}

@Injectable()
export class KnexSeoCandidateScoringRepository
  implements SeoCandidateScoringRepository
{
  constructor(private readonly db: DbService) {}

  async saveCandidateScoringPack(
    command: SaveCandidateScoringPackCommand,
  ): Promise<CandidateScoringPackRecord> {
    const row = toPackRow(command);
    await this.db.knex<CandidateScoringPackRow>(
      'candidate_scoring_packs',
    ).insert(row);

    return toPackRecord(row);
  }

  async findLatestCandidateScoringPack(
    topicId: string,
  ): Promise<CandidateScoringPackRecord | null> {
    const row = await this.db.knex<CandidateScoringPackRow>(
      'candidate_scoring_packs',
    )
      .where({ topic_id: topicId })
      .orderBy('created_at', 'desc')
      .first();

    return row ? toPackRecord(row) : null;
  }
}

function toPackRow(
  command: SaveCandidateScoringPackCommand,
): CandidateScoringPackRow {
  return {
    id: randomUUID(),
    topic_id: command.pack.topicId,
    profile: command.pack.profile,
    language: command.pack.language ?? null,
    language_key: languageKey(command.pack.language),
    geo: command.pack.geo ?? {},
    geo_key: geoKey(command.pack.geo),
    scored_candidates: command.pack.scoredCandidates,
    pack: command.pack,
    degraded: command.pack.degraded,
    warnings: command.pack.warnings,
    rule_version: command.pack.ruleVersion,
    created_at: command.createdAt,
  };
}

function toPackRecord(row: CandidateScoringPackRow): CandidateScoringPackRecord {
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
