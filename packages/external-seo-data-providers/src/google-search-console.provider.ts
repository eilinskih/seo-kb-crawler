import {
  ExternalSeoDataProvider,
  ExternalSeoEnrichmentRequest,
  ExternalSeoMetricSnapshot,
  ExternalSeoObservation,
  ExternalSeoProviderDescriptor,
  ExternalSeoProviderResult,
  ExternalSeoProviderWarning,
} from './domain/external-seo-data-provider-types';

export interface GoogleSearchConsoleProviderOptions {
  accessToken?: string;
  siteUrl?: string;
  endpoint?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}

interface FetchLikeResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

type FetchLike = (
  url: string,
  init: {
    method: 'POST';
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  },
) => Promise<FetchLikeResponse>;

interface SearchConsoleResponse {
  rows?: Array<{
    keys?: string[];
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
  }>;
}

export class GoogleSearchConsoleProvider implements ExternalSeoDataProvider {
  readonly providerKey = 'google_search_console';
  readonly tier = 'owned_data';
  readonly capabilities = [
    'keyword_intelligence',
    'traffic_potential',
    'owned_performance_data',
  ] as const;

  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(private readonly options: GoogleSearchConsoleProviderOptions) {
    this.endpoint =
      options.endpoint ?? 'https://www.googleapis.com/webmasters/v3/sites';
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getStatus(): Promise<ExternalSeoProviderDescriptor> {
    const warnings = this.configurationWarnings();

    return {
      providerKey: this.providerKey,
      tier: this.tier,
      capabilities: [...this.capabilities],
      status: warnings.length > 0 ? 'misconfigured' : 'available',
      warnings,
    };
  }

  async enrich(
    request: ExternalSeoEnrichmentRequest,
  ): Promise<ExternalSeoProviderResult> {
    const warnings = this.configurationWarnings();
    if (warnings.length > 0) {
      return {
        observations: [],
        warnings,
      };
    }

    const response = await this.callSearchAnalytics(request);
    const rows = response.rows ?? [];

    return {
      observations: rows
        .filter((row) => Boolean(row.keys?.[0]))
        .map((row) => toObservation(row, request, this.providerKey)),
    };
  }

  private async callSearchAnalytics(
    request: ExternalSeoEnrichmentRequest,
  ): Promise<SearchConsoleResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const siteUrl = encodeURIComponent(this.options.siteUrl as string);

    try {
      const response = await this.fetchImpl(
        `${this.endpoint}/${siteUrl}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.options.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: request.now?.slice(0, 10) ?? undefined,
            endDate: request.now?.slice(0, 10) ?? undefined,
            dimensions: ['query'],
            rowLimit: Math.max(request.candidateKeywords?.length ?? 10, 10),
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(
          `Google Search Console API returned HTTP ${response.status}: ${await response.text()}`,
        );
      }

      return response.json() as Promise<SearchConsoleResponse>;
    } finally {
      clearTimeout(timeout);
    }
  }

  private configurationWarnings(): ExternalSeoProviderWarning[] {
    const warnings: ExternalSeoProviderWarning[] = [];

    if (!this.options.accessToken) {
      warnings.push({
        providerKey: this.providerKey,
        status: 'misconfigured',
        code: 'missing_access_token',
        message: 'Google Search Console access token is not configured.',
      });
    }

    if (!this.options.siteUrl) {
      warnings.push({
        providerKey: this.providerKey,
        status: 'misconfigured',
        code: 'missing_site_url',
        message: 'Google Search Console site URL is not configured.',
      });
    }

    return warnings;
  }
}

function toObservation(
  row: NonNullable<SearchConsoleResponse['rows']>[number],
  request: ExternalSeoEnrichmentRequest,
  providerKey: string,
): ExternalSeoObservation {
  const subject = row.keys?.[0] ?? '';
  const observedAt = request.now ?? null;
  const metrics: ExternalSeoMetricSnapshot[] = [
    metric('traffic_potential', row.clicks ?? null, providerKey, request, observedAt),
    metric('search_volume', row.impressions ?? null, providerKey, request, observedAt),
    metric('trend', row.ctr ?? null, providerKey, request, observedAt),
  ];

  return {
    observationType: 'keyword',
    providerKey,
    sourceCapability: 'owned_performance_data',
    subject,
    market: request.market,
    language: request.language,
    metrics,
    confidence: 'medium',
    observedAt,
    metadata: {
      position: row.position ?? null,
      source: 'google_search_console',
    },
  };
}

function metric(
  metricName: ExternalSeoMetricSnapshot['metricName'],
  value: number | null,
  providerKey: string,
  request: ExternalSeoEnrichmentRequest,
  fetchedAt: string | null,
): ExternalSeoMetricSnapshot {
  return {
    metricName,
    value,
    market: request.market,
    language: request.language,
    providerKey,
    sourceCapability: 'owned_performance_data',
    fetchedAt,
    confidence: value === null ? 'unknown' : 'medium',
    warningCodes: value === null ? ['owned_metric_unknown'] : [],
  };
}
