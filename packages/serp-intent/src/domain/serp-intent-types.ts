import {
  SerpExpectationKind,
  SerpGeoTarget,
  SerpPack,
  SerpResultReference,
} from '@seo-kb/serp-intelligence';

export type SerpIntentClass = 'core' | 'recommended' | 'opportunity' | 'monitor';

export type SerpIntentDepth = 'unknown' | 'shallow' | 'moderate' | 'deep';

export type SerpIntentGap =
  | 'must_cover'
  | 'recommended'
  | 'opportunity'
  | 'monitor'
  | 'ignore';

export type SerpIntentConfidence = 'unknown' | 'low' | 'medium' | 'high';

export type SerpIntentEvidenceType =
  | 'serp_expectation'
  | 'missing_opportunity'
  | 'content_angle';

export interface SerpIntentAnalyzerConfig {
  minimumMustCoverSourceDiversity: number;
  minimumMustCoverFrequency: number;
  minimumMustCoverConfidence: SerpIntentConfidence;
}

export interface SerpIntentCandidate {
  intentKey: string;
  label: string;
  sourceKinds: SerpExpectationKind[];
  evidenceTypes: SerpIntentEvidenceType[];
  frequency: number;
  sourceDiversity: number;
  supportingResults: SerpResultReference[];
  confidence: SerpIntentConfidence;
}

export interface SerpIntent {
  intentKey: string;
  label: string;
  intentClass: SerpIntentClass;
  frequency: number;
  sourceDiversity: number;
  depth: SerpIntentDepth;
  gap: SerpIntentGap;
  confidence: SerpIntentConfidence;
  supportingResults: SerpResultReference[];
  sourceKinds: SerpExpectationKind[];
  evidenceTypes: SerpIntentEvidenceType[];
}

export interface SerpIntentPack {
  normalizedQuery: string;
  topicId?: string;
  language?: string;
  geo?: SerpGeoTarget;
  sourceSnapshotIds: string[];
  mustCover: SerpIntent[];
  recommended: SerpIntent[];
  opportunity: SerpIntent[];
  monitor: SerpIntent[];
  degraded: boolean;
  warnings: string[];
  ruleVersion: string;
}

export interface SerpIntentPackRequest {
  serpPack: SerpPack;
  config?: Partial<SerpIntentAnalyzerConfig>;
  ruleVersion?: string;
}
