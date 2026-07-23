import {
  CandidateScoringProfileName,
  ScoringConfidence,
  ScoringProfile,
  ScoringSignalType,
} from './domain/seo-candidate-scoring-types';

export const DEFAULT_SEO_CANDIDATE_SCORING_RULE_VERSION =
  'seo-candidate-scoring-foundation-v1';

const SIGNAL_TYPES: ScoringSignalType[] = [
  'demand_strength',
  'serp_weakness',
  'content_gap',
  'faq_gap',
  'entity_gap',
  'serp_volatility',
  'competitor_similarity',
  'knowledge_strength',
  'topic_authority_potential',
  'research_asset_availability',
  'long_tail_specificity',
  'provider_metric',
  'unknown_metric_penalty',
];

export const SCORING_PROFILES: Record<
  CandidateScoringProfileName,
  ScoringProfile
> = {
  default: profile('default', {
    demand_strength: 1.2,
    serp_weakness: 1.1,
    content_gap: 1,
    faq_gap: 0.8,
    entity_gap: 0.8,
    knowledge_strength: 1,
    research_asset_availability: 0.9,
    long_tail_specificity: 0.9,
    unknown_metric_penalty: -0.6,
  }),
  fallback_first: profile('fallback_first', {
    knowledge_strength: 1.3,
    research_asset_availability: 1.2,
    long_tail_specificity: 1.1,
    unknown_metric_penalty: -0.2,
  }),
  authority_building: profile('authority_building', {
    topic_authority_potential: 1.4,
    knowledge_strength: 1.2,
    entity_gap: 1.1,
    content_gap: 1,
  }),
  quick_win: profile('quick_win', {
    serp_weakness: 1.4,
    demand_strength: 1.2,
    provider_metric: 1.1,
    competitor_similarity: -0.8,
  }),
};

export function confidenceRank(confidence: ScoringConfidence): number {
  return {
    unknown: 0,
    low: 1,
    medium: 2,
    high: 3,
  }[confidence];
}

export function scoreConfidence(
  confidences: ScoringConfidence[],
): ScoringConfidence {
  if (confidences.length === 0) {
    return 'unknown';
  }
  const average =
    confidences.reduce((sum, confidence) => sum + confidenceRank(confidence), 0) /
    confidences.length;
  if (average >= 2.5) {
    return 'high';
  }
  if (average >= 1.5) {
    return 'medium';
  }
  if (average > 0) {
    return 'low';
  }
  return 'unknown';
}

function profile(
  name: CandidateScoringProfileName,
  overrides: Partial<Record<ScoringSignalType, number>>,
): ScoringProfile {
  return {
    name,
    weights: Object.fromEntries(
      SIGNAL_TYPES.map((type) => [type, overrides[type] ?? 0.7]),
    ) as Record<ScoringSignalType, number>,
    missingDataPenalty: 8,
    maxScore: 100,
  };
}
