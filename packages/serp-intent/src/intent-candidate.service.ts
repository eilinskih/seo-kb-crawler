import { normalizeSerpText, SerpPack } from '@seo-kb/serp-intelligence';
import {
  SerpIntentCandidate,
  SerpIntentConfidence,
  SerpIntentEvidenceType,
} from './domain/serp-intent-types';

export class IntentCandidateService {
  extract(serpPack: SerpPack): SerpIntentCandidate[] {
    const candidates = new Map<string, SerpIntentCandidate>();

    for (const expectation of serpPack.expectations) {
      upsertCandidate(candidates, {
        intentKey: normalizeSerpText(expectation.label),
        label: expectation.label,
        sourceKinds: [expectation.kind],
        evidenceTypes: ['serp_expectation'],
        frequency: expectation.frequency,
        sourceDiversity: expectation.sourceDiversity,
        supportingResults: expectation.supportingResults,
        confidence: confidence(
          expectation.frequency,
          expectation.sourceDiversity,
        ),
      });
    }

    for (const opportunity of serpPack.missingOpportunities) {
      upsertCandidate(candidates, {
        intentKey: normalizeSerpText(opportunity.label),
        label: opportunity.label,
        sourceKinds: [opportunity.kind],
        evidenceTypes: ['missing_opportunity'],
        frequency: opportunity.frequency,
        sourceDiversity: opportunity.sourceDiversity,
        supportingResults: opportunity.supportingResults,
        confidence: confidence(
          opportunity.frequency,
          opportunity.sourceDiversity,
        ),
      });
    }

    if (serpPack.dominantContentAngle !== 'unknown') {
      const label = `${serpPack.dominantContentAngle} content angle`;
      upsertCandidate(candidates, {
        intentKey: normalizeSerpText(label),
        label,
        sourceKinds: ['angle'],
        evidenceTypes: ['content_angle'],
        frequency: 1,
        sourceDiversity: 1,
        supportingResults: [],
        confidence: 'low',
      });
    }

    return [...candidates.values()]
      .filter((candidate) => candidate.intentKey)
      .sort(
        (a, b) =>
          b.sourceDiversity - a.sourceDiversity ||
          b.frequency - a.frequency ||
          a.intentKey.localeCompare(b.intentKey),
      );
  }
}

function upsertCandidate(
  candidates: Map<string, SerpIntentCandidate>,
  next: SerpIntentCandidate,
): void {
  if (!next.intentKey) {
    return;
  }
  const current = candidates.get(next.intentKey);
  if (!current) {
    candidates.set(next.intentKey, {
      ...next,
      sourceKinds: unique(next.sourceKinds),
      evidenceTypes: unique(next.evidenceTypes),
      supportingResults: uniqueReferences(next.supportingResults),
    });
    return;
  }
  const frequency = Math.max(current.frequency, next.frequency);
  const sourceDiversity = Math.max(
    current.sourceDiversity,
    next.sourceDiversity,
  );
  candidates.set(next.intentKey, {
    ...current,
    sourceKinds: unique([...current.sourceKinds, ...next.sourceKinds]),
    evidenceTypes: unique([...current.evidenceTypes, ...next.evidenceTypes]),
    frequency,
    sourceDiversity,
    supportingResults: uniqueReferences([
      ...current.supportingResults,
      ...next.supportingResults,
    ]),
    confidence: confidence(frequency, sourceDiversity),
  });
}

function confidence(
  frequency: number,
  sourceDiversity: number,
): SerpIntentConfidence {
  if (frequency >= 3 && sourceDiversity >= 3) {
    return 'high';
  }
  if (frequency >= 2 && sourceDiversity >= 2) {
    return 'medium';
  }
  if (frequency > 0 || sourceDiversity > 0) {
    return 'low';
  }
  return 'unknown';
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function uniqueReferences<T extends { resultId: string }>(values: T[]): T[] {
  return values.filter(
    (value, index, all) =>
      all.findIndex((candidate) => candidate.resultId === value.resultId) ===
      index,
  );
}
