import {
  LongTailDimension,
  LongTailDimensionInput,
} from './domain/long-tail-discovery-types';
import {
  normalizeLongTailText,
  stableLongTailKey,
} from './normalize-long-tail-text';
import { confidenceRank } from './long-tail-defaults';

export class LongTailDimensionService {
  extract(inputs: LongTailDimensionInput[]): LongTailDimension[] {
    const dimensions = new Map<string, LongTailDimension>();

    for (const input of inputs) {
      const normalizedValue = normalizeLongTailText(input.label);
      if (!normalizedValue) {
        continue;
      }
      const dimensionKey = stableLongTailKey(input.dimensionType, normalizedValue);
      const current = dimensions.get(dimensionKey);
      const next: LongTailDimension = {
        dimensionKey,
        dimensionType: input.dimensionType,
        label: input.label,
        normalizedValue,
        sourceSignals: [{
          sourceType: input.dimensionType,
          label: input.label,
          supportingIds: input.supportingIds ?? [],
          sourceDiversity: input.sourceDiversity,
        }],
        confidence: input.confidence ?? 'low',
        sourceDiversity: input.sourceDiversity ?? 1,
        compatibleWith: input.compatibleWith ?? [],
      };
      dimensions.set(dimensionKey, mergeDimensions(current, next));
    }

    return [...dimensions.values()].sort(
      (a, b) =>
        a.dimensionType.localeCompare(b.dimensionType) ||
        a.normalizedValue.localeCompare(b.normalizedValue),
    );
  }
}

function mergeDimensions(
  current: LongTailDimension | undefined,
  next: LongTailDimension,
): LongTailDimension {
  if (!current) {
    return next;
  }
  return {
    ...current,
    sourceSignals: [...current.sourceSignals, ...next.sourceSignals],
    confidence:
      confidenceRank(next.confidence) > confidenceRank(current.confidence)
        ? next.confidence
        : current.confidence,
    sourceDiversity: Math.max(current.sourceDiversity, next.sourceDiversity),
    compatibleWith: unique([...current.compatibleWith, ...next.compatibleWith]),
  };
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
