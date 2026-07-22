import {
  DemandObservation,
  DemandDiscoveryRequest,
  DemandProviderAdapter,
  DemandProviderResult,
} from './domain/demand-engine-types';
import { normalizeKeyword } from './normalize-keyword';

export class ManualFallbackDemandProvider implements DemandProviderAdapter {
  readonly providerKey = 'manual_fallback';
  readonly sourceTier = 'fallback';

  async discover(request: DemandDiscoveryRequest): Promise<DemandProviderResult> {
    const seeds = unique([
      request.topicSeed,
      ...(request.manualSeeds ?? []),
    ])
      .map((seed) => seed.trim())
      .filter((seed) => seed.length > 0);

    return {
      observations: seeds.flatMap((seed) => {
        const normalized = normalizeKeyword(seed);
        const observations: DemandObservation[] = [{
          observedText: seed,
          sourceTier: this.sourceTier,
          providerKey: this.providerKey,
          evidenceType: 'manual_seed',
          sourceQuery: request.topicSeed,
        }];
        if (normalized === normalizeKeyword(request.topicSeed)) {
          observations.push({
            observedText: seed,
            sourceTier: this.sourceTier,
            providerKey: this.providerKey,
            evidenceType: 'topic_seed',
            sourceQuery: request.topicSeed,
          });
        }
        return observations;
      }),
    };
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
