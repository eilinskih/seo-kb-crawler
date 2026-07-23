export type ExternalSeoProviderKey = string;

export type ExternalSeoProviderCapability =
  | 'keyword_intelligence'
  | 'search_volume'
  | 'keyword_difficulty'
  | 'cpc'
  | 'trends'
  | 'seasonality'
  | 'country_demand'
  | 'language_variants'
  | 'traffic_potential'
  | 'competitor_keywords'
  | 'organic_competitors'
  | 'top_pages'
  | 'backlinks'
  | 'referring_domains'
  | 'authority_signals'
  | 'serp_history'
  | 'owned_performance_data';

export type ExternalSeoProviderStatus =
  | 'available'
  | 'disabled'
  | 'misconfigured'
  | 'rate_limited'
  | 'unavailable'
  | 'degraded';

export type ExternalSeoProviderTier =
  | 'fallback'
  | 'owned_data'
  | 'serp_snapshot'
  | 'paid_provider';

export type ExternalSeoMetricName =
  | 'search_volume'
  | 'keyword_difficulty'
  | 'cpc'
  | 'traffic_potential'
  | 'trend'
  | 'seasonality'
  | 'authority'
  | 'referring_domains'
  | 'backlinks';

export type ExternalSeoObservationType =
  | 'keyword'
  | 'competitor'
  | 'authority'
  | 'traffic'
  | 'top_page'
  | 'serp_history';

export type ExternalSeoConfidence = 'unknown' | 'low' | 'medium' | 'high';

export interface ExternalSeoMarket {
  countryCode?: string;
  regionCode?: string;
  city?: string;
}

export interface ExternalSeoProviderWarning {
  providerKey: ExternalSeoProviderKey;
  status: ExternalSeoProviderStatus;
  code: string;
  message: string;
}

export interface ExternalSeoProviderDescriptor {
  providerKey: ExternalSeoProviderKey;
  tier: ExternalSeoProviderTier;
  capabilities: ReadonlyArray<ExternalSeoProviderCapability>;
  status: ExternalSeoProviderStatus;
  warnings?: ExternalSeoProviderWarning[];
}

export interface ExternalSeoMetricSnapshot {
  metricName: ExternalSeoMetricName;
  value: number | string | null;
  market?: ExternalSeoMarket;
  language?: string;
  providerKey: ExternalSeoProviderKey;
  sourceCapability: ExternalSeoProviderCapability;
  fetchedAt: string | null;
  confidence: ExternalSeoConfidence;
  warningCodes: string[];
}

export interface ExternalSeoObservation {
  observationType: ExternalSeoObservationType;
  providerKey: ExternalSeoProviderKey;
  sourceCapability: ExternalSeoProviderCapability;
  subject: string;
  url?: string | null;
  market?: ExternalSeoMarket;
  language?: string;
  metrics: ExternalSeoMetricSnapshot[];
  confidence: ExternalSeoConfidence;
  observedAt: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface ExternalSeoEnrichmentRequest {
  topicId?: string;
  topicSeed?: string;
  query?: string;
  candidateKeywords?: string[];
  candidateUrls?: string[];
  market?: ExternalSeoMarket;
  language?: string;
  requestedCapabilities?: ReadonlyArray<ExternalSeoProviderCapability>;
  now?: string;
}

export interface ExternalSeoProviderResult {
  observations: ExternalSeoObservation[];
  warnings?: ExternalSeoProviderWarning[];
}

export interface ExternalSeoEnrichmentPack {
  request: ExternalSeoEnrichmentRequest;
  generatedAt: string;
  degraded: boolean;
  providerStatuses: ExternalSeoProviderDescriptor[];
  warnings: ExternalSeoProviderWarning[];
  observations: ExternalSeoObservation[];
  metricSnapshots: ExternalSeoMetricSnapshot[];
}

export interface ExternalSeoDataProvider {
  readonly providerKey: ExternalSeoProviderKey;
  readonly tier: ExternalSeoProviderTier;
  readonly capabilities: ReadonlyArray<ExternalSeoProviderCapability>;
  getStatus(): Promise<ExternalSeoProviderDescriptor>;
  enrich(
    request: ExternalSeoEnrichmentRequest,
  ): Promise<ExternalSeoProviderResult>;
}
