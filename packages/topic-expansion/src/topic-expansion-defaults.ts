import { ExpansionConfidence } from './domain/topic-expansion-types';

export const DEFAULT_TOPIC_EXPANSION_RULE_VERSION =
  'topic-expansion-foundation-v1';

export function confidenceRank(confidence: ExpansionConfidence): number {
  return {
    unknown: 0,
    low: 1,
    medium: 2,
    high: 3,
  }[confidence];
}

export function highestConfidence(
  values: ExpansionConfidence[],
): ExpansionConfidence {
  return values.sort((a, b) => confidenceRank(b) - confidenceRank(a))[0] ?? 'unknown';
}
