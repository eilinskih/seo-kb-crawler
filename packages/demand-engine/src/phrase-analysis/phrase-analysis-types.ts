import type { DemandEvidenceType } from '../domain/demand-engine-types';

export type PhraseCandidateKind =
  | 'page_cluster'
  | 'product_or_instance'
  | 'brand_navigation'
  | 'low_quality_snippet'
  | 'pending';

export type PhraseTokenRole =
  | 'object'
  | 'connector'
  | 'modifier'
  | 'model_or_sku'
  | 'measurement'
  | 'unknown';

export type PhrasePredicateType =
  | 'has_feature'
  | 'for_target'
  | 'in_context'
  | 'near_location'
  | 'price_intent'
  | 'comparison'
  | 'review_intent'
  | 'question'
  | 'unclassified';

export interface PhraseToken {
  text: string;
  normalizedText: string;
  index: number;
  role: PhraseTokenRole;
}

export interface PhraseSpan {
  text: string;
  tokenIndexes: number[];
}

export interface PhraseAnalysisRequest {
  phrase: string;
  topicSeed: string;
  language?: string;
  evidenceTypes: DemandEvidenceType[];
}

export interface PhraseAnalysisResult {
  providerKey: string;
  candidateKind: PhraseCandidateKind;
  confidence: 'low' | 'medium' | 'high';
  objectSpan?: PhraseSpan;
  modifierSpans: PhraseSpan[];
  predicates: PhrasePredicateType[];
  tokens: PhraseToken[];
  reasons: string[];
}

export interface PhraseAnalysisProvider {
  providerKey: string;
  analyze(request: PhraseAnalysisRequest): PhraseAnalysisResult;
}
