import {
  ExternalSeoDataProvider,
  ExternalSeoEnrichmentRequest,
  ExternalSeoProviderDescriptor,
  ExternalSeoProviderResult,
} from './domain/external-seo-data-provider-types';

export class FallbackSeoSignalsProvider implements ExternalSeoDataProvider {
  readonly providerKey = 'fallback_seo_signals';
  readonly tier = 'fallback';
  readonly capabilities = [
    'keyword_intelligence',
    'traffic_potential',
  ] as const;

  async getStatus(): Promise<ExternalSeoProviderDescriptor> {
    return {
      providerKey: this.providerKey,
      tier: this.tier,
      capabilities: [...this.capabilities],
      status: 'available',
    };
  }

  async enrich(
    request: ExternalSeoEnrichmentRequest,
  ): Promise<ExternalSeoProviderResult> {
    const subjects = unique([
      request.topicSeed,
      request.query,
      ...(request.candidateKeywords ?? []),
    ].filter((value): value is string => Boolean(value?.trim())));

    return {
      observations: subjects.map((subject) => ({
        observationType: 'keyword',
        providerKey: this.providerKey,
        sourceCapability: 'keyword_intelligence',
        subject: subject.trim(),
        market: request.market,
        language: request.language,
        metrics: [{
          metricName: 'traffic_potential',
          value: null,
          market: request.market,
          language: request.language,
          providerKey: this.providerKey,
          sourceCapability: 'traffic_potential',
          fetchedAt: request.now ?? null,
          confidence: 'unknown',
          warningCodes: ['fallback_metric_unknown'],
        }],
        confidence: 'low',
        observedAt: request.now ?? null,
        metadata: {
          source: 'fallback',
        },
      })),
      warnings: [{
        providerKey: this.providerKey,
        status: 'degraded',
        code: 'fallback_only',
        message: 'Only fallback SEO signals are available.',
      }],
    };
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
