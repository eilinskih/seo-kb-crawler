import {
  CandidateForScoring,
  ScoredCandidatePageType,
  ScoringSignalContribution,
} from './domain/seo-candidate-scoring-types';

export class CandidatePageTypeService {
  recommend(
    candidate: CandidateForScoring,
    contributions: ScoringSignalContribution[],
  ): ScoredCandidatePageType {
    if (candidate.pageTypeHint) {
      return candidate.pageTypeHint;
    }
    if (hasStrong(contributions, 'faq_gap')) {
      return 'faq_page';
    }
    if (candidate.normalizedConcept.includes(' vs ')) {
      return 'comparison_page';
    }
    if (candidate.geo?.city || candidate.geo?.regionCode || candidate.geo?.countryCode) {
      return 'local_page';
    }
    return 'supporting_page';
  }
}

function hasStrong(
  contributions: ScoringSignalContribution[],
  signalType: ScoringSignalContribution['signalType'],
): boolean {
  return contributions.some(
    (contribution) =>
      contribution.signalType === signalType && contribution.normalizedScore >= 60,
  );
}
