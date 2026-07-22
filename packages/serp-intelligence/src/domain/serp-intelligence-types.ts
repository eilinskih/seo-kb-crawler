export type SerpProviderMode =
  | 'paid_provider'
  | 'owned_data'
  | 'fallback'
  | 'manual_import';

export type SerpContentAngle =
  | 'informational'
  | 'commercial'
  | 'local'
  | 'guide'
  | 'review'
  | 'comparison'
  | 'tutorial'
  | 'navigational'
  | 'mixed'
  | 'unknown';

export type SerpExpectationKind =
  | 'section'
  | 'faq'
  | 'entity'
  | 'proof_point'
  | 'structure'
  | 'depth'
  | 'angle'
  | 'opportunity';

export interface SerpGeoTarget {
  countryCode?: string;
  regionCode?: string;
  city?: string;
}

export interface SerpResult {
  id: string;
  position: number;
  url: string;
  canonicalUrl?: string | null;
  domain?: string | null;
  title?: string | null;
  snippet?: string | null;
  documentId?: string | null;
  documentVersionId?: string | null;
}

export interface SerpSnapshot {
  id: string;
  query: string;
  normalizedQuery: string;
  topicId?: string;
  language?: string;
  geo?: SerpGeoTarget;
  capturedAt: string;
  providerKey: string;
  providerMode: SerpProviderMode;
  degraded: boolean;
  warnings: string[];
  results: SerpResult[];
}

export interface SerpHeadingObservation {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  position: number;
}

export interface SerpEntityObservation {
  entityId?: string;
  canonicalName: string;
  entityType?: string;
}

export interface SerpPageEvidence {
  resultId: string;
  url: string;
  domain?: string | null;
  title?: string | null;
  snippet?: string | null;
  headings: SerpHeadingObservation[];
  faqQuestions?: string[];
  entities?: SerpEntityObservation[];
  wordCount?: number | null;
  tableCount?: number | null;
  listCount?: number | null;
  comparisonCount?: number | null;
}

export interface SerpResultReference {
  resultId: string;
  position: number;
  url: string;
  domain: string | null;
  title: string | null;
}

export interface SerpHeadingPattern {
  normalizedHeading: string;
  exampleTexts: string[];
  headingLevel: SerpHeadingObservation['level'];
  frequency: number;
  sourceDiversity: number;
  supportingResults: SerpResultReference[];
}

export interface SerpFaqPattern {
  normalizedQuestion: string;
  exampleQuestions: string[];
  frequency: number;
  sourceDiversity: number;
  supportingResults: SerpResultReference[];
}

export interface SerpEntityPattern {
  canonicalName: string;
  entityType: string | null;
  frequency: number;
  sourceDiversity: number;
  supportingResults: SerpResultReference[];
}

export interface SerpRangeSummary {
  min: number | null;
  median: number | null;
  max: number | null;
}

export interface SerpContentDepthSummary {
  wordCount: SerpRangeSummary;
  sectionCount: SerpRangeSummary;
  faqCount: SerpRangeSummary;
  tableUsageRatio: number;
  listUsageRatio: number;
  comparisonUsageRatio: number;
  sampleSize: number;
}

export interface SerpAngleSummary {
  dominantAngle: SerpContentAngle;
  secondaryAngles: SerpContentAngle[];
  scores: Record<SerpContentAngle, number>;
}

export interface SerpExpectation {
  kind: SerpExpectationKind;
  label: string;
  frequency: number;
  sourceDiversity: number;
  supportingResults: SerpResultReference[];
}

export interface SerpPack {
  normalizedQuery: string;
  topicId?: string;
  language?: string;
  geo?: SerpGeoTarget;
  snapshotIds: string[];
  recurringHeadings: SerpHeadingPattern[];
  recurringFaqs: SerpFaqPattern[];
  recurringEntities: SerpEntityPattern[];
  dominantContentAngle: SerpContentAngle;
  secondaryContentAngles: SerpContentAngle[];
  depthSummary: SerpContentDepthSummary;
  expectations: SerpExpectation[];
  missingOpportunities: SerpExpectation[];
  degraded: boolean;
  warnings: string[];
  ruleVersion: string;
}

export interface SerpPackRequest {
  snapshot: SerpSnapshot;
  pages: SerpPageEvidence[];
  ruleVersion?: string;
}
