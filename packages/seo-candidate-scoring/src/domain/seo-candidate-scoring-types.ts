import { SerpGeoTarget } from '@seo-kb/serp-intelligence';

export type ScoringSignalType =
  | 'demand_strength'
  | 'serp_weakness'
  | 'content_gap'
  | 'faq_gap'
  | 'entity_gap'
  | 'serp_volatility'
  | 'competitor_similarity'
  | 'knowledge_strength'
  | 'topic_authority_potential'
  | 'research_asset_availability'
  | 'long_tail_specificity'
  | 'provider_metric'
  | 'unknown_metric_penalty';

export type ScoringConfidence = 'unknown' | 'low' | 'medium' | 'high';

export type ScoreBand = 'low' | 'medium' | 'high';

export type CandidateScoringProfileName =
  | 'default'
  | 'fallback_first'
  | 'authority_building'
  | 'quick_win';

export type ScoredCandidatePageType =
  | 'landing_page'
  | 'guide'
  | 'faq_page'
  | 'comparison_page'
  | 'local_page'
  | 'entity_page'
  | 'supporting_page'
  | 'update_existing';

export interface CandidateForScoring {
  candidateKey: string;
  topicId: string;
  label: string;
  normalizedConcept: string;
  sourceCandidateType?: string;
  pageTypeHint?: ScoredCandidatePageType;
  language?: string;
  geo?: SerpGeoTarget;
  sourcePackReferences?: string[];
  rawSignals: CandidateRawSignal[];
}

export interface CandidateRawSignal {
  signalType: ScoringSignalType;
  rawValue: number | null;
  confidence?: ScoringConfidence;
  rationale: string;
  supportingIds?: string[];
  missingDataWarning?: string;
}

export interface ScoringSignalContribution {
  signalType: ScoringSignalType;
  rawValue: number | null;
  normalizedScore: number;
  weight: number;
  weightedScore: number;
  rationale: string;
  confidence: ScoringConfidence;
  supportingIds: string[];
  missingDataWarning: string | null;
}

export interface ScoringProfile {
  name: CandidateScoringProfileName;
  weights: Record<ScoringSignalType, number>;
  missingDataPenalty: number;
  maxScore: number;
}

export interface FocusedResearchHint {
  code:
    | 'missing_serp_pack'
    | 'missing_serp_intent_pack'
    | 'missing_knowledge_pack'
    | 'unresolved_consensus_conflict'
    | 'missing_provider_metrics'
    | 'weak_source_diversity'
    | 'verify_shallow_competitor_coverage'
    | 'product_owner_review';
  detail: string;
  blocking: false;
}

export interface ScoredCandidate {
  candidateKey: string;
  topicId: string;
  label: string;
  normalizedConcept: string;
  sourceCandidateType?: string;
  recommendedPageType: ScoredCandidatePageType;
  opportunityScore: number;
  scoreBand: ScoreBand;
  confidence: ScoringConfidence;
  signalContributions: ScoringSignalContribution[];
  rationale: string[];
  focusedResearchHints: FocusedResearchHint[];
  warnings: string[];
  degraded: boolean;
  sourcePackReferences: string[];
  ruleVersion: string;
}

export interface CandidateScoringPack {
  topicId: string;
  profile: CandidateScoringProfileName;
  language?: string;
  geo?: SerpGeoTarget;
  scoredCandidates: ScoredCandidate[];
  warnings: string[];
  degraded: boolean;
  ruleVersion: string;
}

export interface CandidateScoringRequest {
  topicId: string;
  profile?: CandidateScoringProfileName;
  language?: string;
  geo?: SerpGeoTarget;
  candidates: CandidateForScoring[];
  warnings?: string[];
  degraded?: boolean;
  ruleVersion?: string;
}
