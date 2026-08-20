import {
  DemandDiscoveryRequest,
  DemandObservation,
  DemandProviderAdapter,
  DemandProviderResult,
} from './domain/demand-engine-types';
import { normalizeKeyword } from './normalize-keyword';

export class TopicUniverseDemandProvider implements DemandProviderAdapter {
  readonly providerKey = 'topic_universe';
  readonly sourceTier = 'fallback';

  async discover(request: DemandDiscoveryRequest): Promise<DemandProviderResult> {
    const seed = normalizeKeyword(request.topicSeed);
    if (!seed) {
      return { observations: [] };
    }

    const vocabulary = (request.manualSeeds ?? [])
      .map((value) => normalizeKeyword(value))
      .filter((value) => value.length > 0 && value !== seed);
    const queries = unique([
      seed,
      ...geoQueries(seed, request.geo?.city),
      ...vocabularyQueries(seed, vocabulary),
    ])
      .filter((query) => query.length <= 180)
      .slice(0, request.limit ?? 100);

    return {
      observations: queries.map((query) => ({
        observedText: query,
        sourceTier: this.sourceTier,
        providerKey: this.providerKey,
        evidenceType: fallbackEvidenceTypeFor(query, seed, request),
        sourceQuery: request.topicSeed,
      })),
    };
  }
}

function vocabularyQueries(
  seed: string,
  vocabulary: string[],
): string[] {
  return unique(vocabulary
    .flatMap((value) => [
      `${seed} ${value}`,
      `${value} ${seed}`,
    ]));
}

function geoQueries(seed: string, city: string | undefined): string[] {
  const normalizedCity = normalizeKeyword(city ?? '');
  if (!normalizedCity || seed.includes(normalizedCity)) {
    return [];
  }
  return [
    `${seed} ${normalizedCity}`,
    `${seed} w ${normalizedCity}`,
    `${seed} near ${normalizedCity}`,
  ];
}

function fallbackEvidenceTypeFor(
  query: string,
  seed: string,
  request: DemandDiscoveryRequest,
): DemandObservation['evidenceType'] {
  const normalizedManualSeeds = new Set(
    (request.manualSeeds ?? []).map((value) => normalizeKeyword(value)),
  );
  if (normalizedManualSeeds.size > 0) {
    const extraTerms = query
      .replace(seed, '')
      .trim()
      .split(/\s+/u)
      .filter(Boolean);
    if (extraTerms.some((term) => normalizedManualSeeds.has(term))) {
      return 'knowledge_graph_combination';
    }
  }
  if (query === seed) {
    return 'topic_seed';
  }
  return 'manual_seed';
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => normalizeKeyword(value)).filter(Boolean))];
}
