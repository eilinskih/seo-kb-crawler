import {
  ExpansionInputSignal,
  ExpansionSignal,
} from './domain/topic-expansion-types';
import { normalizeExpansionText } from './normalize-expansion-text';

export class ExpansionSignalService {
  normalize(inputSignals: ExpansionInputSignal[]): ExpansionSignal[] {
    const signals = new Map<string, ExpansionSignal>();

    for (const input of inputSignals) {
      const normalizedValue = normalizeExpansionText(input.label);
      if (!normalizedValue) {
        continue;
      }
      const key = `${input.signalType}:${normalizedValue}`;
      const existing = signals.get(key);
      const next: ExpansionSignal = {
        signalType: input.signalType,
        label: input.label,
        normalizedValue,
        confidence: input.confidence ?? 'low',
        sourceDiversity: input.sourceDiversity,
        supportingIds: input.supportingIds ?? [],
      };
      signals.set(key, mergeSignals(existing, next));
    }

    return [...signals.values()].sort(
      (a, b) =>
        a.signalType.localeCompare(b.signalType) ||
        a.normalizedValue.localeCompare(b.normalizedValue),
    );
  }
}

function mergeSignals(
  current: ExpansionSignal | undefined,
  next: ExpansionSignal,
): ExpansionSignal {
  if (!current) {
    return next;
  }
  return {
    ...current,
    confidence: strongerConfidence(current.confidence, next.confidence),
    sourceDiversity: Math.max(
      current.sourceDiversity ?? 0,
      next.sourceDiversity ?? 0,
    ),
    supportingIds: unique([...current.supportingIds, ...next.supportingIds]),
  };
}

function strongerConfidence(
  a: ExpansionSignal['confidence'],
  b: ExpansionSignal['confidence'],
): ExpansionSignal['confidence'] {
  const rank = { unknown: 0, low: 1, medium: 2, high: 3 };
  return rank[b] > rank[a] ? b : a;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
