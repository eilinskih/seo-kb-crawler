import {
  LongTailCombinationRule,
  LongTailDimension,
} from './domain/long-tail-discovery-types';
import { confidenceRank } from './long-tail-defaults';

export class CombinationRuleService {
  combinationsForRule(
    rule: LongTailCombinationRule,
    dimensions: LongTailDimension[],
    degraded: boolean,
  ): LongTailDimension[][] {
    const buckets = rule.requiredDimensionTypes.map((type) =>
      dimensions.filter((dimension) =>
        dimension.dimensionType === type &&
        dimension.sourceSignals.length >= rule.minimumEvidenceCount / rule.requiredDimensionTypes.length &&
        confidenceRank(dimension.confidence) >= confidenceRank(rule.minimumConfidence),
      ),
    );

    if (buckets.some((bucket) => bucket.length === 0)) {
      return [];
    }

    const combinations = cartesian(buckets)
      .filter((combination) => compatibleCombination(combination))
      .filter((combination) => !degraded || safeForDegradedRun(combination));

    return combinations.slice(0, rule.maxOutputCount);
  }
}

function cartesian<T>(buckets: T[][]): T[][] {
  return buckets.reduce<T[][]>(
    (acc, bucket) =>
      acc.flatMap((items) => bucket.map((item) => [...items, item])),
    [[]],
  );
}

function compatibleCombination(dimensions: LongTailDimension[]): boolean {
  for (const left of dimensions) {
    for (const right of dimensions) {
      if (left.dimensionKey === right.dimensionKey) {
        continue;
      }
      if (!compatiblePair(left, right)) {
        return false;
      }
    }
  }
  return true;
}

function compatiblePair(
  left: LongTailDimension,
  right: LongTailDimension,
): boolean {
  return (
    left.compatibleWith.includes(right.dimensionKey) ||
    right.compatibleWith.includes(left.dimensionKey) ||
    coOccurs(left, right)
  );
}

function coOccurs(left: LongTailDimension, right: LongTailDimension): boolean {
  const leftIds = new Set(
    left.sourceSignals.flatMap((signal) => signal.supportingIds),
  );
  return right.sourceSignals.some((signal) =>
    signal.supportingIds.some((id) => leftIds.has(id)),
  );
}

function safeForDegradedRun(dimensions: LongTailDimension[]): boolean {
  return dimensions.every((dimension) => dimension.confidence === 'high');
}
