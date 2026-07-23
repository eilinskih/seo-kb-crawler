import {
  LongTailCombinationRule,
  LongTailConfidence,
  LongTailMetricSnapshot,
} from './domain/long-tail-discovery-types';

export const DEFAULT_LONG_TAIL_RULE_VERSION = 'long-tail-discovery-foundation-v1';

export const UNKNOWN_LONG_TAIL_METRICS: LongTailMetricSnapshot = {
  searchVolume: null,
  keywordDifficulty: null,
  cpc: null,
  trafficPotential: null,
  providerKey: null,
};

export const DEFAULT_LONG_TAIL_RULES: LongTailCombinationRule[] = [
  {
    ruleKey: 'city-procedure',
    requiredDimensionTypes: ['city', 'procedure'],
    optionalDimensionTypes: [],
    maxOutputCount: 25,
    minimumConfidence: 'medium',
    minimumEvidenceCount: 2,
    candidatePageTypeHint: 'local_page',
  },
  {
    ruleKey: 'city-procedure-body-part',
    requiredDimensionTypes: ['city', 'procedure', 'body_part'],
    optionalDimensionTypes: [],
    maxOutputCount: 25,
    minimumConfidence: 'medium',
    minimumEvidenceCount: 3,
    candidatePageTypeHint: 'local_page',
  },
  {
    ruleKey: 'technology-body-part',
    requiredDimensionTypes: ['technology', 'body_part'],
    optionalDimensionTypes: [],
    maxOutputCount: 20,
    minimumConfidence: 'medium',
    minimumEvidenceCount: 2,
    candidatePageTypeHint: 'supporting_page',
  },
  {
    ruleKey: 'procedure-faq',
    requiredDimensionTypes: ['procedure', 'faq'],
    optionalDimensionTypes: [],
    maxOutputCount: 20,
    minimumConfidence: 'medium',
    minimumEvidenceCount: 2,
    candidatePageTypeHint: 'faq_page',
  },
  {
    ruleKey: 'procedure-comparison',
    requiredDimensionTypes: ['procedure', 'comparison'],
    optionalDimensionTypes: [],
    maxOutputCount: 20,
    minimumConfidence: 'medium',
    minimumEvidenceCount: 2,
    candidatePageTypeHint: 'comparison_page',
  },
];

export function confidenceRank(confidence: LongTailConfidence): number {
  return {
    unknown: 0,
    low: 1,
    medium: 2,
    high: 3,
  }[confidence];
}

export function lowestConfidence(values: LongTailConfidence[]): LongTailConfidence {
  return values.sort((a, b) => confidenceRank(a) - confidenceRank(b))[0] ?? 'unknown';
}
