import {
  ScoreBand,
  ScoringConfidence,
  ScoringProfile,
  ScoringSignalContribution,
} from './domain/seo-candidate-scoring-types';
import { scoreConfidence } from './seo-candidate-scoring-defaults';

export interface OpportunityScoreResult {
  opportunityScore: number;
  scoreBand: ScoreBand;
  confidence: ScoringConfidence;
  degraded: boolean;
}

export class OpportunityScoreService {
  score(
    contributions: ScoringSignalContribution[],
    profile: ScoringProfile,
    upstreamDegraded: boolean,
  ): OpportunityScoreResult {
    const totalWeight = contributions.reduce(
      (sum, contribution) => sum + Math.abs(contribution.weight),
      0,
    );
    const weightedTotal = contributions.reduce(
      (sum, contribution) => sum + contribution.weightedScore,
      0,
    );
    const opportunityScore =
      totalWeight === 0
        ? 0
        : clamp(Math.round(weightedTotal / totalWeight), 0, profile.maxScore);
    const degraded =
      upstreamDegraded ||
      contributions.length === 0 ||
      contributions.some((contribution) => contribution.rawValue === null);

    return {
      opportunityScore,
      scoreBand: band(opportunityScore),
      confidence: degraded
        ? downgrade(scoreConfidence(contributions.map((item) => item.confidence)))
        : scoreConfidence(contributions.map((item) => item.confidence)),
      degraded,
    };
  }
}

function band(score: number): ScoreBand {
  if (score >= 70) {
    return 'high';
  }
  if (score >= 40) {
    return 'medium';
  }
  return 'low';
}

function downgrade(confidence: ScoringConfidence): ScoringConfidence {
  if (confidence === 'high') {
    return 'medium';
  }
  if (confidence === 'medium') {
    return 'low';
  }
  return confidence;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
