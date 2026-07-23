import { SerpGeoTarget } from '@seo-kb/serp-intelligence';

export type LongTailDimensionType =
  | 'city'
  | 'procedure'
  | 'body_part'
  | 'gender'
  | 'price'
  | 'season'
  | 'technology'
  | 'contraindication'
  | 'faq'
  | 'aftercare'
  | 'comparison'
  | 'intent';

export type LongTailConfidence = 'unknown' | 'low' | 'medium' | 'high';

export type LongTailCandidateStatus =
  | 'candidate'
  | 'needs_validation'
  | 'rejected'
  | 'promoted';

export type LongTailCandidatePageType =
  | 'supporting_page'
  | 'faq_page'
  | 'comparison_page'
  | 'local_page'
  | 'guide'
  | 'entity_page';

export interface LongTailMetricSnapshot {
  searchVolume: number | null;
  keywordDifficulty: number | null;
  cpc: number | null;
  trafficPotential: number | null;
  providerKey: string | null;
}

export interface LongTailSourceSignal {
  sourceType: string;
  label: string;
  supportingIds: string[];
  sourceDiversity?: number;
}

export interface LongTailDimensionInput {
  dimensionType: LongTailDimensionType;
  label: string;
  confidence?: LongTailConfidence;
  sourceDiversity?: number;
  supportingIds?: string[];
  compatibleWith?: string[];
}

export interface LongTailDimension {
  dimensionKey: string;
  dimensionType: LongTailDimensionType;
  label: string;
  normalizedValue: string;
  sourceSignals: LongTailSourceSignal[];
  confidence: LongTailConfidence;
  sourceDiversity: number;
  compatibleWith: string[];
}

export interface LongTailCombinationRule {
  ruleKey: string;
  requiredDimensionTypes: LongTailDimensionType[];
  optionalDimensionTypes: LongTailDimensionType[];
  maxOutputCount: number;
  minimumConfidence: LongTailConfidence;
  minimumEvidenceCount: number;
  candidatePageTypeHint: LongTailCandidatePageType;
}

export interface LongTailCandidate {
  candidateKey: string;
  topicId: string;
  normalizedConcept: string;
  displayLabel: string;
  dimensions: LongTailDimension[];
  sourceSignals: LongTailSourceSignal[];
  evidenceSummary: string;
  metrics: LongTailMetricSnapshot;
  missingMetrics: string[];
  confidence: LongTailConfidence;
  warnings: string[];
  candidatePageTypeHint: LongTailCandidatePageType;
  status: LongTailCandidateStatus;
}

export interface LongTailOpportunityTree {
  treeKey: string;
  rootLabel: string;
  pathLabels: string[];
  childCandidateKeys: string[];
  supportingSignalCount: number;
  confidence: LongTailConfidence;
  warnings: string[];
}

export interface LongTailDiscoveryPack {
  topicId: string;
  normalizedTopicLabel: string;
  language?: string;
  geo?: SerpGeoTarget;
  sourcePackReferences: string[];
  dimensions: LongTailDimension[];
  combinationRulesApplied: string[];
  opportunityTrees: LongTailOpportunityTree[];
  candidates: LongTailCandidate[];
  warnings: string[];
  degraded: boolean;
  ruleVersion: string;
}

export interface LongTailDiscoveryRequest {
  topicId: string;
  topicLabel: string;
  language?: string;
  geo?: SerpGeoTarget;
  sourcePackReferences?: string[];
  dimensionInputs: LongTailDimensionInput[];
  rules?: LongTailCombinationRule[];
  maxCandidatesPerRun?: number;
  degraded?: boolean;
  warnings?: string[];
  ruleVersion?: string;
}
