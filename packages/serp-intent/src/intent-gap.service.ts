import {
  SerpIntentAnalyzerConfig,
  SerpIntentCandidate,
  SerpIntentClass,
  SerpIntentDepth,
  SerpIntentGap,
} from './domain/serp-intent-types';
import { confidenceRank } from './serp-intent-defaults';

export interface IntentGapDecision {
  intentClass: SerpIntentClass;
  gap: SerpIntentGap;
}

export class IntentGapService {
  classify(
    candidate: SerpIntentCandidate,
    depth: SerpIntentDepth,
    options: {
      config: SerpIntentAnalyzerConfig;
      degraded: boolean;
    },
  ): IntentGapDecision {
    if (this.isMustCover(candidate, options.config)) {
      return options.degraded
        ? { intentClass: 'recommended', gap: 'recommended' }
        : { intentClass: 'core', gap: 'must_cover' };
    }

    if (candidate.evidenceTypes.includes('missing_opportunity')) {
      return { intentClass: 'opportunity', gap: 'opportunity' };
    }

    if (depth === 'moderate') {
      return { intentClass: 'recommended', gap: 'recommended' };
    }

    if (depth === 'shallow') {
      return { intentClass: 'opportunity', gap: 'opportunity' };
    }

    return { intentClass: 'monitor', gap: 'monitor' };
  }

  private isMustCover(
    candidate: SerpIntentCandidate,
    config: SerpIntentAnalyzerConfig,
  ): boolean {
    if (
      candidate.sourceKinds.length > 0 &&
      candidate.sourceKinds.every((kind) => kind === 'entity')
    ) {
      return false;
    }
    return (
      candidate.sourceDiversity >= config.minimumMustCoverSourceDiversity &&
      candidate.frequency >= config.minimumMustCoverFrequency &&
      confidenceRank(candidate.confidence) >=
        confidenceRank(config.minimumMustCoverConfidence)
    );
  }
}
