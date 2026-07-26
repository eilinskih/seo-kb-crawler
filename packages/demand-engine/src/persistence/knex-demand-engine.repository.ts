import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  CandidatePage,
  DemandGeoTarget,
  DemandMetricSnapshot,
  DemandObservation,
  KeywordCandidate,
} from '../domain/demand-engine-types';
import { normalizeKeyword } from '../normalize-keyword';
import {
  DemandCandidatePageRecord,
  DemandDiscoveryPersistenceResult,
  DemandEngineRepository,
  DemandKeywordCandidateRecord,
  DemandMetricSnapshotRecord,
  DemandObservationRecord,
  SaveDemandDiscoveryResultCommand,
} from './demand-engine.repository';

interface DemandKeywordCandidateRow {
  id: string;
  topic_id: string | null;
  topic_key: string;
  normalized_keyword: string;
  language: string | null;
  language_key: string;
  geo: DemandGeoTarget;
  geo_key: string;
  observed_texts: string[];
  source_tiers: KeywordCandidate['sourceTiers'];
  providers: string[];
  evidence_types: KeywordCandidate['evidenceTypes'];
  confidence: KeywordCandidate['confidence'];
  metrics: DemandMetricSnapshot;
  last_observed_at: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface DemandObservationRow {
  id: string;
  keyword_candidate_id: string;
  topic_id: string | null;
  topic_key: string;
  observed_text: string;
  source_tier: DemandObservation['sourceTier'];
  provider_key: string;
  evidence_type: DemandObservation['evidenceType'];
  source_query: string;
  evidence_url: string | null;
  metrics: Partial<DemandMetricSnapshot>;
  observed_at: Date | string;
  created_at: Date | string;
}

interface DemandMetricSnapshotRow {
  id: string;
  keyword_candidate_id: string;
  topic_id: string | null;
  search_volume: number | null;
  keyword_difficulty: number | null;
  cpc: string | number | null;
  traffic_potential: number | null;
  trend: string | number | null;
  seasonality: string | null;
  metric_status: DemandMetricSnapshot['metricStatus'];
  provider_key: string | null;
  collected_at: Date | string | null;
  metadata: Record<string, unknown>;
  created_at: Date | string;
}

interface DemandCandidatePageRow {
  id: string;
  keyword_candidate_id: string;
  topic_id: string | null;
  topic_key: string;
  slug: string;
  primary_keyword: string;
  supporting_keywords: string[];
  proposed_page_type: CandidatePage['proposedPageType'];
  confidence: CandidatePage['confidence'];
  evidence_types: CandidatePage['evidenceTypes'];
  metrics: DemandMetricSnapshot;
  missing_metrics: string[];
  page_action: CandidatePage['pageAction'];
  created_at: Date | string;
  updated_at: Date | string;
}

@Injectable()
export class KnexDemandEngineRepository implements DemandEngineRepository {
  constructor(private readonly db: DbService) {}

  async saveDiscoveryResult(
    command: SaveDemandDiscoveryResultCommand,
  ): Promise<DemandDiscoveryPersistenceResult> {
    const keywordCandidates: DemandKeywordCandidateRecord[] = [];
    const candidateByKeyword = new Map<string, DemandKeywordCandidateRecord>();

    for (const candidate of command.result.keywordCandidates) {
      const record = await this.upsertKeywordCandidate(
        candidate,
        command.topicId,
        command.observedAt,
      );
      keywordCandidates.push(record);
      candidateByKeyword.set(candidate.normalizedKeyword, record);
    }

    const observations = await this.insertObservations(
      command.result.observations,
      candidateByKeyword,
      command.topicId,
      command.observedAt,
    );
    const metricSnapshots = await this.insertMetricSnapshots(
      keywordCandidates,
      command.topicId,
      command.observedAt,
    );
    const candidatePages = await this.upsertCandidatePages(
      command.result.candidatePages,
      candidateByKeyword,
      command.topicId,
      command.observedAt,
    );

    return {
      keywordCandidates,
      observations,
      metricSnapshots,
      candidatePages,
    };
  }

  async listKeywordCandidates(topicId: string): Promise<DemandKeywordCandidateRecord[]> {
    const rows = await this.db.knex<DemandKeywordCandidateRow>(
      'demand_keyword_candidates',
    )
      .where('topic_id', topicId)
      .orderBy('updated_at', 'desc')
      .orderBy('normalized_keyword', 'asc');

    return rows.map(toKeywordCandidateRecord);
  }

  async listCandidatePages(topicId: string): Promise<DemandCandidatePageRecord[]> {
    const rows = await this.db.knex<DemandCandidatePageRow>(
      'demand_candidate_pages',
    )
      .where('topic_id', topicId)
      .orderBy('updated_at', 'desc')
      .orderBy('slug', 'asc');

    return rows.map(toCandidatePageRecord);
  }

  private async upsertKeywordCandidate(
    candidate: KeywordCandidate,
    topicId: string | undefined,
    observedAt: string,
  ): Promise<DemandKeywordCandidateRecord> {
    const existing = await this.db.knex<DemandKeywordCandidateRow>(
      'demand_keyword_candidates',
    )
      .where({
        topic_key: topicKey(topicId),
        normalized_keyword: candidate.normalizedKeyword,
        language_key: languageKey(candidate.language),
        geo_key: geoKey(candidate.geo),
      })
      .first();
    const row = toKeywordCandidateRow(candidate, topicId, observedAt, existing);

    await this.db.knex<DemandKeywordCandidateRow>('demand_keyword_candidates')
      .insert(row)
      .onConflict(['topic_key', 'normalized_keyword', 'language_key', 'geo_key'])
      .merge({
        observed_texts: row.observed_texts,
        source_tiers: row.source_tiers,
        providers: row.providers,
        evidence_types: row.evidence_types,
        confidence: row.confidence,
        metrics: row.metrics,
        last_observed_at: row.last_observed_at,
        updated_at: row.updated_at,
      });

    return toKeywordCandidateRecord(row);
  }

  private async insertObservations(
    observations: DemandObservation[],
    candidateByKeyword: Map<string, DemandKeywordCandidateRecord>,
    topicId: string | undefined,
    observedAt: string,
  ): Promise<DemandObservationRecord[]> {
    const rows = observations
      .map((observation) => {
        const candidate = candidateByKeyword.get(
          normalizeKeyword(observation.observedText),
        );
        return candidate
          ? toObservationRow(observation, candidate.id, topicId, observedAt)
          : null;
      })
      .filter((row): row is DemandObservationRow => row !== null);

    if (rows.length > 0) {
      await this.db.knex<DemandObservationRow>('demand_observations').insert(rows);
    }

    return rows.map(toObservationRecord);
  }

  private async insertMetricSnapshots(
    candidates: DemandKeywordCandidateRecord[],
    topicId: string | undefined,
    observedAt: string,
  ): Promise<DemandMetricSnapshotRecord[]> {
    const rows = candidates.map((candidate) =>
      toMetricSnapshotRow(candidate, topicId, observedAt),
    );

    if (rows.length > 0) {
      await this.db.knex<DemandMetricSnapshotRow>(
        'demand_metric_snapshots',
      ).insert(rows);
    }

    return rows.map(toMetricSnapshotRecord);
  }

  private async upsertCandidatePages(
    pages: CandidatePage[],
    candidateByKeyword: Map<string, DemandKeywordCandidateRecord>,
    topicId: string | undefined,
    observedAt: string,
  ): Promise<DemandCandidatePageRecord[]> {
    const records: DemandCandidatePageRecord[] = [];

    for (const page of pages) {
      const candidate = candidateByKeyword.get(page.primaryKeyword);
      if (!candidate) {
        continue;
      }

      const existing = await this.db.knex<DemandCandidatePageRow>(
        'demand_candidate_pages',
      )
        .where({
          topic_key: topicKey(topicId),
          slug: page.slug,
        })
        .first();
      const row = toCandidatePageRow(page, candidate.id, topicId, observedAt, existing);
      await this.db.knex<DemandCandidatePageRow>('demand_candidate_pages')
        .insert(row)
        .onConflict(['topic_key', 'slug'])
        .merge({
          keyword_candidate_id: row.keyword_candidate_id,
          primary_keyword: row.primary_keyword,
          supporting_keywords: row.supporting_keywords,
          proposed_page_type: row.proposed_page_type,
          confidence: row.confidence,
          evidence_types: row.evidence_types,
          metrics: row.metrics,
          missing_metrics: row.missing_metrics,
          page_action: row.page_action,
          updated_at: row.updated_at,
        });
      records.push(toCandidatePageRecord(row));
    }

    return records;
  }
}

function toKeywordCandidateRow(
  candidate: KeywordCandidate,
  topicId: string | undefined,
  observedAt: string,
  existing?: DemandKeywordCandidateRow,
): DemandKeywordCandidateRow {
  return {
    id: existing?.id ?? randomUUID(),
    topic_id: topicId ?? null,
    topic_key: topicKey(topicId),
    normalized_keyword: candidate.normalizedKeyword,
    language: candidate.language ?? null,
    language_key: languageKey(candidate.language),
    geo: candidate.geo ?? {},
    geo_key: geoKey(candidate.geo),
    observed_texts: candidate.observedTexts,
    source_tiers: candidate.sourceTiers,
    providers: candidate.providers,
    evidence_types: candidate.evidenceTypes,
    confidence: candidate.confidence,
    metrics: candidate.metrics,
    last_observed_at: observedAt,
    created_at: existing?.created_at ?? observedAt,
    updated_at: observedAt,
  };
}

function toKeywordCandidateRecord(
  row: DemandKeywordCandidateRow,
): DemandKeywordCandidateRecord {
  return {
    id: row.id,
    topicId: row.topic_id,
    normalizedKeyword: row.normalized_keyword,
    observedTexts: row.observed_texts,
    language: row.language ?? undefined,
    geo: row.geo,
    sourceTiers: row.source_tiers,
    providers: row.providers,
    evidenceTypes: row.evidence_types,
    confidence: row.confidence,
    metrics: row.metrics,
    lastObservedAt: toIsoString(row.last_observed_at),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function toObservationRow(
  observation: DemandObservation,
  keywordCandidateId: string,
  topicId: string | undefined,
  observedAt: string,
): DemandObservationRow {
  return {
    id: randomUUID(),
    keyword_candidate_id: keywordCandidateId,
    topic_id: topicId ?? null,
    topic_key: topicKey(topicId),
    observed_text: observation.observedText,
    source_tier: observation.sourceTier,
    provider_key: observation.providerKey,
    evidence_type: observation.evidenceType,
    source_query: observation.sourceQuery,
    evidence_url: observation.evidenceUrl ?? null,
    metrics: observation.metrics ?? {},
    observed_at: observedAt,
    created_at: observedAt,
  };
}

function toObservationRecord(row: DemandObservationRow): DemandObservationRecord {
  return {
    id: row.id,
    keywordCandidateId: row.keyword_candidate_id,
    topicId: row.topic_id,
    observedText: row.observed_text,
    sourceTier: row.source_tier,
    providerKey: row.provider_key,
    evidenceType: row.evidence_type,
    sourceQuery: row.source_query,
    evidenceUrl: row.evidence_url,
    metrics: row.metrics,
    observedAt: toIsoString(row.observed_at),
    createdAt: toIsoString(row.created_at),
  };
}

function toMetricSnapshotRow(
  candidate: DemandKeywordCandidateRecord,
  topicId: string | undefined,
  observedAt: string,
): DemandMetricSnapshotRow {
  return {
    id: randomUUID(),
    keyword_candidate_id: candidate.id,
    topic_id: topicId ?? null,
    search_volume: candidate.metrics.searchVolume,
    keyword_difficulty: candidate.metrics.keywordDifficulty,
    cpc: candidate.metrics.cpc,
    traffic_potential: candidate.metrics.trafficPotential,
    trend: candidate.metrics.trend,
    seasonality: candidate.metrics.seasonality,
    metric_status: candidate.metrics.metricStatus,
    provider_key: candidate.metrics.providerKey,
    collected_at: candidate.metrics.collectedAt,
    metadata: {
      confidence: candidate.confidence,
      providers: candidate.providers,
      sourceTiers: candidate.sourceTiers,
    },
    created_at: observedAt,
  };
}

function toMetricSnapshotRecord(
  row: DemandMetricSnapshotRow,
): DemandMetricSnapshotRecord {
  return {
    id: row.id,
    keywordCandidateId: row.keyword_candidate_id,
    topicId: row.topic_id,
    searchVolume: row.search_volume,
    keywordDifficulty: row.keyword_difficulty,
    cpc: row.cpc === null ? null : Number(row.cpc),
    trafficPotential: row.traffic_potential,
    trend: row.trend === null ? null : Number(row.trend),
    seasonality: row.seasonality,
    metricStatus: row.metric_status,
    providerKey: row.provider_key,
    collectedAt: row.collected_at ? toIsoString(row.collected_at) : null,
    metadata: row.metadata,
    createdAt: toIsoString(row.created_at),
  };
}

function toCandidatePageRow(
  page: CandidatePage,
  keywordCandidateId: string,
  topicId: string | undefined,
  observedAt: string,
  existing?: DemandCandidatePageRow,
): DemandCandidatePageRow {
  return {
    id: existing?.id ?? randomUUID(),
    keyword_candidate_id: keywordCandidateId,
    topic_id: topicId ?? null,
    topic_key: topicKey(topicId),
    slug: page.slug,
    primary_keyword: page.primaryKeyword,
    supporting_keywords: page.supportingKeywords,
    proposed_page_type: page.proposedPageType,
    confidence: page.confidence,
    evidence_types: page.evidenceTypes,
    metrics: page.metrics,
    missing_metrics: page.missingMetrics,
    page_action: page.pageAction,
    created_at: existing?.created_at ?? observedAt,
    updated_at: observedAt,
  };
}

function toCandidatePageRecord(row: DemandCandidatePageRow): DemandCandidatePageRecord {
  return {
    id: row.id,
    keywordCandidateId: row.keyword_candidate_id,
    topicId: row.topic_id,
    slug: row.slug,
    primaryKeyword: row.primary_keyword,
    supportingKeywords: row.supporting_keywords,
    proposedPageType: row.proposed_page_type,
    confidence: row.confidence,
    evidenceTypes: row.evidence_types,
    metrics: row.metrics,
    missingMetrics: row.missing_metrics,
    pageAction: row.page_action,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function geoKey(geo: DemandGeoTarget | undefined): string {
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
  toCandidatePageRow,
  toObservationRow,
};
