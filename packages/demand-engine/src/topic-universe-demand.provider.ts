import {
  DemandDiscoveryRequest,
  DemandObservation,
  DemandProviderAdapter,
  DemandProviderResult,
} from './domain/demand-engine-types';
import { normalizeKeyword } from './normalize-keyword';

interface QueryPattern {
  evidenceType: DemandObservation['evidenceType'];
  build(seed: string): string[];
}

const POLISH_PATTERNS: QueryPattern[] = [
  {
    evidenceType: 'autocomplete',
    build: (seed) => [
      `${seed} cena`,
      `${seed} cennik`,
      `ile kosztuje ${seed}`,
      `${seed} koszt`,
    ],
  },
  {
    evidenceType: 'people_also_ask',
    build: (seed) => [
      `czy ${seed} boli`,
      `czy ${seed} jest bezpieczne`,
      `jak wygląda ${seed}`,
      `jak przygotować się do ${seed}`,
      `ile trwa ${seed}`,
      `ile zabiegów ${seed}`,
      `zalecenia po ${seed}`,
      `przeciwwskazania ${seed}`,
    ],
  },
  {
    evidenceType: 'related_search',
    build: (seed) => [
      `${seed} efekty`,
      `${seed} opinie`,
      `${seed} przed i po`,
      `${seed} rodzaje`,
      `${seed} alternatywy`,
      `${seed} czy warto`,
      `${seed} dla mężczyzn`,
    ],
  },
  {
    evidenceType: 'related_search',
    build: (seed) => [
      `${seed} vs`,
      `${seed} czy lepsze`,
      `${seed} różnice`,
    ],
  },
];

const ENGLISH_PATTERNS: QueryPattern[] = [
  {
    evidenceType: 'autocomplete',
    build: (seed) => [
      `${seed} price`,
      `${seed} cost`,
      `${seed} pricing`,
      `how much does ${seed} cost`,
    ],
  },
  {
    evidenceType: 'people_also_ask',
    build: (seed) => [
      `does ${seed} hurt`,
      `is ${seed} safe`,
      `how does ${seed} work`,
      `how to prepare for ${seed}`,
      `how long does ${seed} take`,
      `${seed} contraindications`,
      `${seed} aftercare`,
    ],
  },
  {
    evidenceType: 'related_search',
    build: (seed) => [
      `${seed} results`,
      `${seed} reviews`,
      `${seed} before and after`,
      `${seed} types`,
      `${seed} alternatives`,
      `${seed} for men`,
      `${seed} vs`,
    ],
  },
];

export class TopicUniverseDemandProvider implements DemandProviderAdapter {
  readonly providerKey = 'topic_universe';
  readonly sourceTier = 'fallback';

  async discover(request: DemandDiscoveryRequest): Promise<DemandProviderResult> {
    const seed = normalizeKeyword(request.topicSeed);
    if (!seed) {
      return { observations: [] };
    }

    const patterns = patternsFor(request.language);
    const queries = unique([
      seed,
      ...patterns.flatMap((pattern) => pattern.build(seed)),
      ...geoQueries(seed, request.geo?.city),
      ...vocabularyQueries(seed, request.manualSeeds ?? []),
    ])
      .filter((query) => query.length <= 180)
      .slice(0, request.limit ?? 100);

    return {
      observations: queries.map((query) => ({
        observedText: query,
        sourceTier: this.sourceTier,
        providerKey: this.providerKey,
        evidenceType: evidenceTypeFor(query, seed, request),
        sourceQuery: request.topicSeed,
      })),
    };
  }
}

function vocabularyQueries(seed: string, vocabulary: string[]): string[] {
  return unique(vocabulary
    .map((value) => normalizeKeyword(value))
    .filter((value) => value.length > 0 && value !== seed)
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

function evidenceTypeFor(
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
  if (/^(czy|jak|ile|does|is|how)\b/u.test(query)) {
    return 'people_also_ask';
  }
  return 'autocomplete';
}

function patternsFor(language: string | undefined): QueryPattern[] {
  return language?.toLowerCase().startsWith('pl')
    ? POLISH_PATTERNS
    : ENGLISH_PATTERNS;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => normalizeKeyword(value)).filter(Boolean))];
}
