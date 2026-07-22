export type DemandSourceTier = 'paid_provider' | 'owned_data' | 'fallback';

export type DemandEvidenceType =
  | 'topic_seed'
  | 'manual_seed'
  | 'autocomplete'
  | 'people_also_ask'
  | 'related_search'
  | 'serp_snippet'
  | 'competitor_heading'
  | 'competitor_sitemap'
  | 'faq_block'
  | 'knowledge_graph_combination';

export type DemandConfidence = 'unknown' | 'low' | 'medium' | 'high';

export type DemandMetricStatus =
  | 'provider_backed'
  | 'owned_data_backed'
  | 'fallback_only'
  | 'unknown';

export interface DemandGeoTarget {
  countryCode?: string;
  regionCode?: string;
  city?: string;
}

export interface DemandMetricSnapshot {
  searchVolume: number | null;
  keywordDifficulty: number | null;
  cpc: number | null;
  trafficPotential: number | null;
  trend: number | null;
  seasonality: string | null;
  metricStatus: DemandMetricStatus;
  providerKey: string | null;
  collectedAt: string | null;
}

export interface DemandObservation {
  observedText: string;
  sourceTier: DemandSourceTier;
  providerKey: string;
  evidenceType: DemandEvidenceType;
  sourceQuery: string;
  evidenceUrl?: string | null;
  metrics?: Partial<DemandMetricSnapshot>;
}

export interface KeywordCandidate {
  normalizedKeyword: string;
  observedTexts: string[];
  language?: string;
  geo?: DemandGeoTarget;
  sourceTiers: DemandSourceTier[];
  providers: string[];
  evidenceTypes: DemandEvidenceType[];
  confidence: DemandConfidence;
  metrics: DemandMetricSnapshot;
}

export interface CandidatePage {
  slug: string;
  primaryKeyword: string;
  supportingKeywords: string[];
  proposedPageType: 'landing_page' | 'guide' | 'faq' | 'comparison' | 'local_page';
  confidence: DemandConfidence;
  evidenceTypes: DemandEvidenceType[];
  metrics: DemandMetricSnapshot;
  missingMetrics: string[];
  pageAction: 'new' | 'update' | 'merge' | 'split' | 'reject';
}

export interface DemandDiscoveryRequest {
  topicSeed: string;
  topicId?: string;
  language?: string;
  geo?: DemandGeoTarget;
  manualSeeds?: string[];
  limit?: number;
}

export interface DemandDiscoveryResult {
  normalizedTopic: string;
  fallbackMode: boolean;
  warnings: string[];
  keywordCandidates: KeywordCandidate[];
  candidatePages: CandidatePage[];
}

export interface DemandProviderResult {
  observations: DemandObservation[];
  warnings?: string[];
}

export interface DemandProviderAdapter {
  providerKey: string;
  sourceTier: DemandSourceTier;
  discover(request: DemandDiscoveryRequest): Promise<DemandProviderResult>;
}
