import {
  ExternalSeoEnrichmentService,
  ExternalSeoMetricSnapshot,
  ExternalSeoObservation,
} from '@seo-kb/external-seo-data-providers';
import {
  DemandDiscoveryRequest,
  DemandMetricSnapshot,
  DemandSourceTier,
  DemandObservation,
  DemandProviderAdapter,
  DemandProviderResult,
} from './domain/demand-engine-types';

export class ExternalSeoDemandProvider implements DemandProviderAdapter {
  readonly providerKey = 'external_seo';
  readonly sourceTier = 'paid_provider' as const;

  constructor(
    private readonly enrichmentService = new ExternalSeoEnrichmentService(),
  ) {}

  async discover(
    request: DemandDiscoveryRequest,
  ): Promise<DemandProviderResult> {
    const pack = await this.enrichmentService.enrich({
      topicId: request.topicId,
      topicSeed: request.topicSeed,
      query: request.topicSeed,
      candidateKeywords: request.manualSeeds,
      market: request.geo,
      language: request.language,
      requestedCapabilities: [
        'keyword_intelligence',
        'search_volume',
        'keyword_difficulty',
        'cpc',
        'traffic_potential',
        'trends',
        'seasonality',
      ],
    });

    return {
      observations: pack.observations
        .filter((observation) => observation.observationType === 'keyword')
        .map((observation): DemandObservation => ({
          observedText: observation.subject,
          sourceTier: sourceTierFor(observation),
          providerKey: observation.providerKey,
          evidenceType: 'provider_keyword_metric',
          sourceQuery: request.topicSeed,
          evidenceUrl: observation.url ?? null,
          metrics: toDemandMetrics(
            observation.metrics,
            observation.providerKey,
            sourceTierFor(observation),
          ),
        })),
      warnings: pack.warnings.map((warning) =>
        `${warning.providerKey}: ${warning.message}`,
      ),
    };
  }
}

function toDemandMetrics(
  metrics: ExternalSeoMetricSnapshot[],
  providerKey: string,
  sourceTier: DemandSourceTier,
): Partial<DemandMetricSnapshot> {
  const byName = new Map(metrics.map((metric) => [metric.metricName, metric]));
  const hasProviderMetric = metrics.some((metric) =>
    metric.value !== null && metric.confidence !== 'unknown',
  );

  return {
    searchVolume: numberMetric(byName.get('search_volume')),
    keywordDifficulty: numberMetric(byName.get('keyword_difficulty')),
    cpc: numberMetric(byName.get('cpc')),
    trafficPotential: numberMetric(byName.get('traffic_potential')),
    trend: numberMetric(byName.get('trend')),
    seasonality: stringMetric(byName.get('seasonality')),
    metricStatus: metricStatusFor(sourceTier, hasProviderMetric),
    providerKey,
    collectedAt: metrics.find((metric) => metric.fetchedAt)?.fetchedAt ?? null,
  };
}

function sourceTierFor(observation: ExternalSeoObservation): DemandSourceTier {
  if (observation.providerKey === 'fallback_seo_signals') {
    return 'fallback';
  }

  if (observation.sourceCapability === 'owned_performance_data') {
    return 'owned_data';
  }

  return 'paid_provider';
}

function metricStatusFor(
  sourceTier: DemandSourceTier,
  hasProviderMetric: boolean,
): DemandMetricSnapshot['metricStatus'] {
  if (!hasProviderMetric) {
    return sourceTier === 'fallback' ? 'fallback_only' : 'unknown';
  }

  return sourceTier === 'owned_data' ? 'owned_data_backed' : 'provider_backed';
}

function numberMetric(metric: ExternalSeoMetricSnapshot | undefined): number | null {
  if (typeof metric?.value === 'number') {
    return metric.value;
  }

  if (typeof metric?.value === 'string') {
    const parsed = Number(metric.value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function stringMetric(metric: ExternalSeoMetricSnapshot | undefined): string | null {
  if (typeof metric?.value === 'string') {
    return metric.value;
  }

  if (typeof metric?.value === 'number') {
    return String(metric.value);
  }

  return null;
}
