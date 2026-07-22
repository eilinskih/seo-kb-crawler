import {
  SerpIntentCandidate,
  SerpIntentDepth,
} from './domain/serp-intent-types';

export class IntentDepthService {
  classify(candidate: SerpIntentCandidate): SerpIntentDepth {
    if (candidate.frequency === 0 && candidate.sourceDiversity === 0) {
      return 'unknown';
    }
    if (candidate.frequency >= 3 || candidate.sourceDiversity >= 3) {
      return 'deep';
    }
    if (candidate.frequency >= 2 || candidate.sourceDiversity >= 2) {
      return 'moderate';
    }
    return 'shallow';
  }
}
