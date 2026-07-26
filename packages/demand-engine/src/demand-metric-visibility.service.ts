import { Inject, Injectable } from '@nestjs/common';
import { DEMAND_ENGINE_REPOSITORY } from './demand-engine.tokens';
import {
  DemandMetricSnapshot,
  DemandMetricStatus,
} from './domain/demand-engine-types';
import {
  DemandCandidatePageRecord,
  DemandEngineRepository,
  DemandKeywordCandidateRecord,
} from './persistence/demand-engine.repository';

export type DemandMetricVisibilityStatus =
  | 'unknown_metrics'
  | 'stale_metrics'
  | 'fresh_metrics';

export interface DemandMetricVisibilityRequest {
  topicId: string;
  observedAt?: string;
  staleAfterHours?: number;
  includeFresh?: boolean;
}

export interface DemandMetricVisibilityItem {
  keywordCandidateId: string;
  topicId: string | null;
  normalizedKeyword: string;
  candidatePageId: string | null;
  candidatePageSlug: string | null;
  metricStatus: DemandMetricStatus;
  providerKey: string | null;
  collectedAt: string | null;
  missingMetrics: string[];
  visibilityStatus: DemandMetricVisibilityStatus;
  staleAfterHours: number;
  lastObservedAt: string;
}

export interface DemandMetricVisibilityReport {
  topicId: string;
  generatedAt: string;
  staleAfterHours: number;
  unknownMetricCount: number;
  staleMetricCount: number;
  freshMetricCount: number;
  items: DemandMetricVisibilityItem[];
}

const DEFAULT_STALE_AFTER_HOURS = 24 * 30;

@Injectable()
export class DemandMetricVisibilityService {
  constructor(
    @Inject(DEMAND_ENGINE_REPOSITORY)
    private readonly repository: DemandEngineRepository,
  ) {}

  async report(
    request: DemandMetricVisibilityRequest,
  ): Promise<DemandMetricVisibilityReport> {
    const generatedAt = request.observedAt ?? new Date().toISOString();
    const staleAfterHours =
      request.staleAfterHours ?? DEFAULT_STALE_AFTER_HOURS;
    const [keywordCandidates, candidatePages] = await Promise.all([
      this.repository.listKeywordCandidates(request.topicId),
      this.repository.listCandidatePages(request.topicId),
    ]);
    const pageByCandidate = new Map(
      candidatePages.map((page) => [page.keywordCandidateId, page]),
    );

    const allItems = keywordCandidates.map((candidate) =>
      toVisibilityItem({
        candidate,
        page: pageByCandidate.get(candidate.id) ?? null,
        generatedAt,
        staleAfterHours,
      }),
    );
    const items = request.includeFresh
      ? allItems
      : allItems.filter((item) => item.visibilityStatus !== 'fresh_metrics');

    return {
      topicId: request.topicId,
      generatedAt,
      staleAfterHours,
      unknownMetricCount: allItems.filter((item) =>
        item.visibilityStatus === 'unknown_metrics',
      ).length,
      staleMetricCount: allItems.filter((item) =>
        item.visibilityStatus === 'stale_metrics',
      ).length,
      freshMetricCount: allItems.filter((item) =>
        item.visibilityStatus === 'fresh_metrics',
      ).length,
      items,
    };
  }
}

function toVisibilityItem(command: {
  candidate: DemandKeywordCandidateRecord;
  page: DemandCandidatePageRecord | null;
  generatedAt: string;
  staleAfterHours: number;
}): DemandMetricVisibilityItem {
  const missingMetrics = missingDemandMetrics(command.candidate.metrics);
  const visibilityStatus = visibilityStatusFor({
    metrics: command.candidate.metrics,
    missingMetrics,
    generatedAt: command.generatedAt,
    staleAfterHours: command.staleAfterHours,
  });

  return {
    keywordCandidateId: command.candidate.id,
    topicId: command.candidate.topicId,
    normalizedKeyword: command.candidate.normalizedKeyword,
    candidatePageId: command.page?.id ?? null,
    candidatePageSlug: command.page?.slug ?? null,
    metricStatus: command.candidate.metrics.metricStatus,
    providerKey: command.candidate.metrics.providerKey,
    collectedAt: command.candidate.metrics.collectedAt,
    missingMetrics,
    visibilityStatus,
    staleAfterHours: command.staleAfterHours,
    lastObservedAt: command.candidate.lastObservedAt,
  };
}

function visibilityStatusFor(command: {
  metrics: DemandMetricSnapshot;
  missingMetrics: string[];
  generatedAt: string;
  staleAfterHours: number;
}): DemandMetricVisibilityStatus {
  if (
    command.metrics.metricStatus === 'unknown' ||
    command.metrics.metricStatus === 'fallback_only' ||
    command.missingMetrics.length > 0
  ) {
    return 'unknown_metrics';
  }

  if (isStale(command.metrics, command.generatedAt, command.staleAfterHours)) {
    return 'stale_metrics';
  }

  return 'fresh_metrics';
}

function isStale(
  metrics: DemandMetricSnapshot,
  generatedAt: string,
  staleAfterHours: number,
): boolean {
  if (!metrics.collectedAt) {
    return true;
  }
  const collectedAt = Date.parse(metrics.collectedAt);
  const now = Date.parse(generatedAt);
  if (Number.isNaN(collectedAt) || Number.isNaN(now)) {
    return true;
  }
  const maxAgeMs = staleAfterHours * 60 * 60 * 1000;
  return now - collectedAt > maxAgeMs;
}

function missingDemandMetrics(metrics: DemandMetricSnapshot): string[] {
  return [
    ['searchVolume', metrics.searchVolume],
    ['keywordDifficulty', metrics.keywordDifficulty],
    ['cpc', metrics.cpc],
    ['trafficPotential', metrics.trafficPotential],
  ]
    .filter(([, value]) => value === null)
    .map(([metricName]) => String(metricName));
}
