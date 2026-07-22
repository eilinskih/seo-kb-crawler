import {
  SerpIntentAnalyzerConfig,
  SerpIntentConfidence,
} from './domain/serp-intent-types';

export const DEFAULT_SERP_INTENT_RULE_VERSION = 'serp-intent-foundation-v1';

export const DEFAULT_SERP_INTENT_CONFIG: SerpIntentAnalyzerConfig = {
  minimumMustCoverSourceDiversity: 2,
  minimumMustCoverFrequency: 2,
  minimumMustCoverConfidence: 'medium',
};

export function confidenceRank(confidence: SerpIntentConfidence): number {
  return {
    unknown: 0,
    low: 1,
    medium: 2,
    high: 3,
  }[confidence];
}
