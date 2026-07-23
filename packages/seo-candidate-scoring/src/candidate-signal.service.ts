import {
  CandidateForScoring,
  ScoringProfile,
  ScoringSignalContribution,
} from './domain/seo-candidate-scoring-types';

export class CandidateSignalService {
  normalize(
    candidate: CandidateForScoring,
    profile: ScoringProfile,
  ): ScoringSignalContribution[] {
    return candidate.rawSignals.map((signal) => {
      const normalizedScore = normalizeValue(signal.rawValue);
      const weight = profile.weights[signal.signalType];
      const weightedScore =
        signal.rawValue === null
          ? -profile.missingDataPenalty
          : normalizedScore * weight;

      return {
        signalType: signal.signalType,
        rawValue: signal.rawValue,
        normalizedScore,
        weight,
        weightedScore,
        rationale: signal.rationale,
        confidence: signal.confidence ?? (signal.rawValue === null ? 'unknown' : 'low'),
        supportingIds: signal.supportingIds ?? [],
        missingDataWarning: signal.missingDataWarning ?? null,
      };
    });
  }
}

function normalizeValue(value: number | null): number {
  if (value === null) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
}
