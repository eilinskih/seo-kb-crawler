import {
  FocusedResearchHint,
  ScoringSignalContribution,
} from './domain/seo-candidate-scoring-types';

export class FocusedResearchHintService {
  generate(contributions: ScoringSignalContribution[]): FocusedResearchHint[] {
    const hints: FocusedResearchHint[] = [];
    if (missing(contributions, 'serp_weakness')) {
      hints.push(hint('missing_serp_pack', 'Collect SERP Pack evidence before writing.'));
    }
    if (missing(contributions, 'content_gap') && missing(contributions, 'faq_gap')) {
      hints.push(hint('missing_serp_intent_pack', 'Collect SERP Intent Pack evidence before writing.'));
    }
    if (missing(contributions, 'knowledge_strength')) {
      hints.push(hint('missing_knowledge_pack', 'Build or refresh Knowledge Pack evidence.'));
    }
    if (hasMissingProviderMetrics(contributions)) {
      hints.push(hint('missing_provider_metrics', 'Provider metrics are unavailable; keep score confidence conservative.'));
    }
    if (weakSourceDiversity(contributions)) {
      hints.push(hint('weak_source_diversity', 'Validate candidate with additional independent sources.'));
    }
    if (lowSignal(contributions, 'serp_weakness')) {
      hints.push(hint('verify_shallow_competitor_coverage', 'Verify competitor weakness with focused SERP research.'));
    }
    return dedupeHints(hints);
  }
}

function hint(
  code: FocusedResearchHint['code'],
  detail: string,
): FocusedResearchHint {
  return { code, detail, blocking: false };
}

function missing(
  contributions: ScoringSignalContribution[],
  signalType: ScoringSignalContribution['signalType'],
): boolean {
  return !contributions.some((contribution) => contribution.signalType === signalType);
}

function lowSignal(
  contributions: ScoringSignalContribution[],
  signalType: ScoringSignalContribution['signalType'],
): boolean {
  return contributions.some(
    (contribution) =>
      contribution.signalType === signalType &&
      contribution.rawValue !== null &&
      contribution.normalizedScore < 35,
  );
}

function hasMissingProviderMetrics(
  contributions: ScoringSignalContribution[],
): boolean {
  return contributions.some(
    (contribution) =>
      contribution.signalType === 'unknown_metric_penalty' ||
      contribution.signalType === 'provider_metric' && contribution.rawValue === null,
  );
}

function weakSourceDiversity(
  contributions: ScoringSignalContribution[],
): boolean {
  return contributions.every((contribution) => contribution.supportingIds.length <= 1);
}

function dedupeHints(hints: FocusedResearchHint[]): FocusedResearchHint[] {
  return hints.filter(
    (hintItem, index, all) =>
      all.findIndex((candidate) => candidate.code === hintItem.code) === index,
  );
}
