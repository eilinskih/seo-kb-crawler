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
  | 'knowledge_graph_combination'
  | 'provider_keyword_metric';

export type DemandConfidence = 'unknown' | 'low' | 'medium' | 'high';

export type DemandEvidenceQuality = 'weak' | 'medium' | 'strong';

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
  evidenceQuality?: DemandEvidenceQuality;
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
  evidenceQuality?: DemandEvidenceQuality;
  confidence: DemandConfidence;
  metrics: DemandMetricSnapshot;
  phraseAnalysis?: {
    providerKey: string;
    candidateKind: string;
    confidence: 'low' | 'medium' | 'high';
    entityEvidence?: Array<{
      text: string;
      providerKey: string;
      externalId: string | null;
      name: string;
      types: string[];
      confidence: 'unknown' | 'low' | 'medium' | 'high';
    }>;
    reasons: string[];
  };
}

export interface CandidatePage {
  slug: string;
  primaryKeyword: string;
  supportingKeywords: string[];
  proposedPageType: 'landing_page' | 'guide' | 'faq' | 'comparison' | 'local_page';
  confidence: DemandConfidence;
  readiness?: 'ready' | 'partial' | 'not_ready';
  primaryIntent?: string;
  clusterKey?: string;
  clusterLabel?: string;
  evidenceTypes: DemandEvidenceType[];
  evidenceQuality?: DemandEvidenceQuality;
  evidenceUrls?: string[];
  metrics: DemandMetricSnapshot;
  missingMetrics: string[];
  missingResearchGaps?: string[];
  phraseAnalysis?: KeywordCandidate['phraseAnalysis'];
  pageAction: 'new' | 'update' | 'merge' | 'split' | 'reject';
}

export interface DemandDiscoveryRequest {
  topicSeed: string;
  topicId?: string;
  language?: string;
  geo?: DemandGeoTarget;
  manualSeeds?: string[];
  evidenceObservations?: DemandObservation[];
  limit?: number;
}

export interface DemandDiscoveryResult {
  normalizedTopic: string;
  fallbackMode: boolean;
  warnings: string[];
  observations: DemandObservation[];
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
