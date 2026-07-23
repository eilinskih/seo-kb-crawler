import { SerpGeoTarget } from '@seo-kb/serp-intelligence';

export type ExpansionSignalType =
  | 'demand_candidate'
  | 'serp_heading'
  | 'serp_faq'
  | 'serp_entity'
  | 'serp_missing_opportunity'
  | 'intent_opportunity'
  | 'knowledge_entity'
  | 'knowledge_alias'
  | 'knowledge_fact'
  | 'knowledge_gap'
  | 'geo_hint';

export type ExpansionConfidence = 'unknown' | 'low' | 'medium' | 'high';

export type ExpansionCandidateType =
  | 'supporting_page'
  | 'faq_page'
  | 'entity_page'
  | 'comparison_page'
  | 'geo_page'
  | 'cluster_page'
  | 'update_existing';

export type ExpansionCandidateStatus =
  | 'candidate'
  | 'needs_validation'
  | 'rejected'
  | 'promoted';

export interface ExpansionSignal {
  signalType: ExpansionSignalType;
  label: string;
  normalizedValue: string;
  confidence: ExpansionConfidence;
  sourceDiversity?: number;
  supportingIds: string[];
}

export interface ExpansionInputSignal {
  signalType: ExpansionSignalType;
  label: string;
  confidence?: ExpansionConfidence;
  sourceDiversity?: number;
  supportingIds?: string[];
}

export interface ExpansionCandidate {
  candidateKey: string;
  topicId: string;
  candidateType: ExpansionCandidateType;
  primaryLabel: string;
  normalizedConcept: string;
  supportingLabels: string[];
  signals: ExpansionSignal[];
  confidence: ExpansionConfidence;
  language?: string;
  geo?: SerpGeoTarget;
  evidenceSummary: string;
  warnings: string[];
  status: ExpansionCandidateStatus;
}

export interface TopicExpansionCluster {
  clusterKey: string;
  parentLabel: string;
  normalizedParent: string;
  childCandidateKeys: string[];
  sourceSignalCounts: Partial<Record<ExpansionSignalType, number>>;
  confidence: ExpansionConfidence;
  warnings: string[];
}

export interface TopicExpansionPack {
  topicId: string;
  normalizedTopicLabel: string;
  language?: string;
  geo?: SerpGeoTarget;
  sourcePackReferences: string[];
  clusters: TopicExpansionCluster[];
  candidates: ExpansionCandidate[];
  warnings: string[];
  degraded: boolean;
  ruleVersion: string;
}

export interface TopicExpansionRequest {
  topicId: string;
  topicLabel: string;
  language?: string;
  geo?: SerpGeoTarget;
  sourcePackReferences?: string[];
  inputSignals: ExpansionInputSignal[];
  warnings?: string[];
  degraded?: boolean;
  ruleVersion?: string;
}
