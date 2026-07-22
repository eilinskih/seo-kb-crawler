import {
  CandidatePage,
  DemandConfidence,
  DemandDiscoveryRequest,
  DemandDiscoveryResult,
  DemandMetricSnapshot,
  DemandObservation,
  DemandProviderAdapter,
  KeywordCandidate,
} from './domain/demand-engine-types';
import { ManualFallbackDemandProvider } from './manual-fallback-demand.provider';
import { normalizeKeyword } from './normalize-keyword';

const UNKNOWN_METRICS: DemandMetricSnapshot = {
  searchVolume: null,
  keywordDifficulty: null,
  cpc: null,
  trafficPotential: null,
  trend: null,
  seasonality: null,
  metricStatus: 'unknown',
  providerKey: null,
  collectedAt: null,
};

export class DemandEngineService {
  constructor(
    private readonly providers: DemandProviderAdapter[] = [
      new ManualFallbackDemandProvider(),
    ],
  ) {}

  async discover(
    request: DemandDiscoveryRequest,
  ): Promise<DemandDiscoveryResult> {
    const normalizedTopic = normalizeKeyword(request.topicSeed);
    const observations: DemandObservation[] = [];
    const warnings: string[] = [];

    for (const provider of this.providers) {
      try {
        const result = await provider.discover(request);
        observations.push(...result.observations);
        warnings.push(...(result.warnings ?? []));
      } catch (error) {
        warnings.push(
          `${provider.providerKey} unavailable: ${errorMessage(error)}`,
        );
      }
    }

    const keywordCandidates = buildKeywordCandidates(
      observations,
      request,
    ).slice(0, request.limit ?? 100);

    return {
      normalizedTopic,
      fallbackMode: keywordCandidates.every((candidate) =>
        candidate.sourceTiers.every((tier) => tier === 'fallback'),
      ),
      warnings,
      keywordCandidates,
      candidatePages: buildCandidatePages(keywordCandidates),
    };
  }
}

function buildKeywordCandidates(
  observations: DemandObservation[],
  request: DemandDiscoveryRequest,
): KeywordCandidate[] {
  const byKeyword = new Map<string, DemandObservation[]>();
  for (const observation of observations) {
    const normalized = normalizeKeyword(observation.observedText);
    if (!normalized) {
      continue;
    }
    byKeyword.set(normalized, [...(byKeyword.get(normalized) ?? []), observation]);
  }

  return [...byKeyword.entries()]
    .map(([normalizedKeyword, grouped]) => {
      const metrics = mergeMetrics(grouped);
      return {
        normalizedKeyword,
        observedTexts: unique(grouped.map((observation) => observation.observedText)),
        language: request.language,
        geo: request.geo,
        sourceTiers: unique(grouped.map((observation) => observation.sourceTier)),
        providers: unique(grouped.map((observation) => observation.providerKey)),
        evidenceTypes: unique(grouped.map((observation) => observation.evidenceType)),
        confidence: confidence(grouped, metrics),
        metrics,
      };
    })
    .sort((a, b) =>
      confidenceRank(b.confidence) - confidenceRank(a.confidence) ||
      b.evidenceTypes.length - a.evidenceTypes.length ||
      a.normalizedKeyword.localeCompare(b.normalizedKeyword),
    );
}

function buildCandidatePages(candidates: KeywordCandidate[]): CandidatePage[] {
  return candidates
    .filter((candidate) =>
      candidate.metrics.metricStatus !== 'fallback_only' ||
      candidate.evidenceTypes.length >= 2,
    )
    .map((candidate) => ({
      slug: `/${candidate.normalizedKeyword.replace(/\s+/gu, '-')}/`,
      primaryKeyword: candidate.normalizedKeyword,
      supportingKeywords: [],
      proposedPageType: candidate.normalizedKeyword.includes(' vs ')
        ? 'comparison'
        : 'guide',
      confidence: candidate.confidence,
      evidenceTypes: candidate.evidenceTypes,
      metrics: candidate.metrics,
      missingMetrics: missingMetrics(candidate.metrics),
      pageAction: 'new',
    }));
}

function mergeMetrics(observations: DemandObservation[]): DemandMetricSnapshot {
  const providerMetric = observations.find((observation) =>
    observation.metrics?.metricStatus === 'provider_backed',
  );
  const ownedMetric = observations.find((observation) =>
    observation.metrics?.metricStatus === 'owned_data_backed',
  );
  const source = providerMetric ?? ownedMetric;
  if (!source?.metrics) {
    return {
      ...UNKNOWN_METRICS,
      metricStatus: observations.length > 0 ? 'fallback_only' : 'unknown',
      providerKey: observations[0]?.providerKey ?? null,
    };
  }
  return {
    ...UNKNOWN_METRICS,
    ...source.metrics,
    metricStatus: source.metrics.metricStatus ?? 'unknown',
    providerKey: source.providerKey,
  };
}

function confidence(
  observations: DemandObservation[],
  metrics: DemandMetricSnapshot,
): DemandConfidence {
  if (metrics.metricStatus === 'provider_backed' || metrics.metricStatus === 'owned_data_backed') {
    return 'high';
  }
  if (unique(observations.map((observation) => observation.evidenceType)).length >= 3) {
    return 'medium';
  }
  if (observations.length > 0) {
    return 'low';
  }
  return 'unknown';
}

function missingMetrics(metrics: DemandMetricSnapshot): string[] {
  return [
    ['searchVolume', metrics.searchVolume],
    ['keywordDifficulty', metrics.keywordDifficulty],
    ['cpc', metrics.cpc],
    ['trafficPotential', metrics.trafficPotential],
  ]
    .filter(([, value]) => value === null)
    .map(([key]) => String(key));
}

function confidenceRank(confidence: DemandConfidence): number {
  return {
    unknown: 0,
    low: 1,
    medium: 2,
    high: 3,
  }[confidence];
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
