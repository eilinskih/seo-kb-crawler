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
  MarkCandidatePagesSerpValidatedCommand,
  SaveDemandDiscoveryResultCommand,
} from './demand-engine.repository';

interface DemandKeywordCandidateRow {
  id: string;
  topic_id: string | null;
  topic_key: string;
  normalized_keyword: string;
  language: string | null;
  language_key: string;
  geo: JsonColumn<DemandGeoTarget>;
  geo_key: string;
  observed_texts: JsonColumn<string[]>;
  source_tiers: JsonColumn<KeywordCandidate['sourceTiers']>;
  providers: JsonColumn<string[]>;
  evidence_types: JsonColumn<KeywordCandidate['evidenceTypes']>;
  confidence: KeywordCandidate['confidence'];
  metrics: JsonColumn<DemandMetricSnapshot>;
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
  metrics: JsonColumn<Partial<DemandMetricSnapshot>>;
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
  metadata: JsonColumn<Record<string, unknown>>;
  created_at: Date | string;
}

interface DemandCandidatePageRow {
  id: string;
  keyword_candidate_id: string;
  topic_id: string | null;
  topic_key: string;
  slug: string;
  primary_keyword: string;
  supporting_keywords: JsonColumn<string[]>;
  proposed_page_type: CandidatePage['proposedPageType'];
  confidence: CandidatePage['confidence'];
  readiness: NonNullable<CandidatePage['readiness']>;
  primary_intent: string | null;
  cluster_key: string | null;
  cluster_label: string | null;
  evidence_types: JsonColumn<CandidatePage['evidenceTypes']>;
  evidence_urls: JsonColumn<string[]>;
  metrics: JsonColumn<DemandMetricSnapshot>;
  missing_metrics: JsonColumn<string[]>;
  missing_research_gaps: JsonColumn<string[]>;
  page_action: CandidatePage['pageAction'];
  created_at: Date | string;
  updated_at: Date | string;
}

type JsonColumn<Value> = Value | string;

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

  async markCandidatePagesSerpValidated(
    command: MarkCandidatePagesSerpValidatedCommand,
  ): Promise<DemandCandidatePageRecord[]> {
    if (command.validations.length === 0) {
      return [];
    }

    const rows = await this.db.knex<DemandCandidatePageRow>(
      'demand_candidate_pages',
    )
      .where('topic_id', command.topicId)
      .orderBy('slug', 'asc');
    const updated: DemandCandidatePageRecord[] = [];

    for (const row of rows) {
      const record = toCandidatePageRecord(row);
      const matches = command.validations.filter((validation) =>
        pageMatchesQuery(record, validation.query),
      );
      if (matches.length === 0) {
        continue;
      }

      const evidenceTypes = unique([
        ...record.evidenceTypes,
        'serp_snippet' as const,
      ]);
      const evidenceUrls = unique([
        ...(record.evidenceUrls ?? []),
        ...matches.flatMap((validation) => validation.evidenceUrls),
      ]);
      const missingResearchGaps = (record.missingResearchGaps ?? [])
        .filter((gap) => gap !== 'SERP validation evidence');

      const patch = {
        evidence_types: json(evidenceTypes),
        evidence_urls: json(evidenceUrls),
        missing_research_gaps: json(missingResearchGaps),
        readiness: 'ready' as const,
        updated_at: command.validatedAt,
      };

      await this.db.knex<DemandCandidatePageRow>('demand_candidate_pages')
        .where({ id: row.id })
        .update(patch);

      updated.push(toCandidatePageRecord({
        ...row,
        ...patch,
      }));
    }

    return updated;
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
          readiness: row.readiness,
          primary_intent: row.primary_intent,
          cluster_key: row.cluster_key,
          cluster_label: row.cluster_label,
          evidence_types: row.evidence_types,
          evidence_urls: row.evidence_urls,
          metrics: row.metrics,
          missing_metrics: row.missing_metrics,
          missing_research_gaps: row.missing_research_gaps,
          page_action: row.page_action,
          updated_at: row.updated_at,
        });
      records.push(toCandidatePageRecord(row));
    }

    await this.deleteStaleCandidatePages(
      topicId,
      pages.map((page) => page.slug),
    );

    return records;
  }

  private async deleteStaleCandidatePages(
    topicId: string | undefined,
    currentSlugs: string[],
  ): Promise<void> {
    const query = this.db.knex<DemandCandidatePageRow>('demand_candidate_pages')
      .where({ topic_key: topicKey(topicId) });
    if (currentSlugs.length > 0) {
      query.whereNotIn('slug', currentSlugs);
    }
    await query.delete();
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
    geo: json(candidate.geo ?? {}),
    geo_key: geoKey(candidate.geo),
    observed_texts: json(candidate.observedTexts),
    source_tiers: json(candidate.sourceTiers),
    providers: json(candidate.providers),
    evidence_types: json(candidate.evidenceTypes),
    confidence: candidate.confidence,
    metrics: json(candidate.metrics),
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
    observedTexts: parseJson(row.observed_texts),
    language: row.language ?? undefined,
    geo: parseJson(row.geo),
    sourceTiers: parseJson(row.source_tiers),
    providers: parseJson(row.providers),
    evidenceTypes: parseJson(row.evidence_types),
    confidence: row.confidence,
    metrics: parseJson(row.metrics),
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
    metrics: json(observation.metrics ?? {}),
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
    metrics: parseJson(row.metrics),
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
    metadata: json({
      confidence: candidate.confidence,
      providers: candidate.providers,
      sourceTiers: candidate.sourceTiers,
    }),
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
    metadata: parseJson(row.metadata),
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
    supporting_keywords: json(page.supportingKeywords),
    proposed_page_type: page.proposedPageType,
    confidence: page.confidence,
    readiness: page.readiness ?? readinessFromConfidence(page.confidence),
    primary_intent: page.primaryIntent ?? null,
    cluster_key: page.clusterKey ?? null,
    cluster_label: page.clusterLabel ?? null,
    evidence_types: json(page.evidenceTypes),
    evidence_urls: json(page.evidenceUrls ?? []),
    metrics: json(page.metrics),
    missing_metrics: json(page.missingMetrics),
    missing_research_gaps: json(page.missingResearchGaps ?? []),
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
    supportingKeywords: parseJson(row.supporting_keywords),
    proposedPageType: row.proposed_page_type,
    confidence: row.confidence,
    readiness: row.readiness,
    primaryIntent: row.primary_intent ?? undefined,
    clusterKey: row.cluster_key ?? undefined,
    clusterLabel: row.cluster_label ?? undefined,
    evidenceTypes: parseJson(row.evidence_types),
    evidenceUrls: parseJson(row.evidence_urls),
    metrics: parseJson(row.metrics),
    missingMetrics: parseJson(row.missing_metrics),
    missingResearchGaps: parseJson(row.missing_research_gaps),
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

function json<Value>(value: Value): string {
  return JSON.stringify(value);
}

function parseJson<Value>(value: JsonColumn<Value>): Value {
  return typeof value === 'string' ? JSON.parse(value) as Value : value;
}

function readinessFromConfidence(
  confidence: CandidatePage['confidence'],
): NonNullable<CandidatePage['readiness']> {
  if (confidence === 'high') {
    return 'ready';
  }
  if (confidence === 'medium') {
    return 'partial';
  }
  return 'not_ready';
}

function pageMatchesQuery(page: DemandCandidatePageRecord, query: string): boolean {
  const normalizedQuery = normalizeKeyword(query);
  return page.primaryKeyword === normalizedQuery ||
    page.supportingKeywords.includes(normalizedQuery);
}

function unique<Value>(values: Value[]): Value[] {
  return [...new Set(values)];
}

export const __testing = {
  toCandidatePageRow,
  toObservationRow,
};
