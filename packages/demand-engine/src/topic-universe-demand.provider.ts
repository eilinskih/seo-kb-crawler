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

interface LanguageExpansionSet {
  patterns: QueryPattern[];
  modifiers: Record<string, string[]>;
  prepositions: {
    in: string;
    near: string;
    for: string;
    with: string;
    without: string;
  };
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

const POLISH_EXPANSION: LanguageExpansionSet = {
  patterns: POLISH_PATTERNS,
  prepositions: {
    in: 'w',
    near: 'okolice',
    for: 'dla',
    with: 'z',
    without: 'bez',
  },
  modifiers: {
    price: [
      'cena',
      'cennik',
      'koszt',
      'ile kosztuje',
      'promocja',
      'pakiet',
      'tanie',
    ],
    commercial: [
      'salon',
      'gabinet',
      'klinika',
      'najlepszy',
      'opinie',
      'ranking',
      'rezerwacja',
      'konsultacja',
      'termin',
    ],
    local: [
      'blisko mnie',
      'centrum',
      'okolice',
      'podkarpackie',
    ],
    informational: [
      'efekty',
      'czy warto',
      'jak wygląda',
      'ile trwa',
      'ile zabiegów',
      'jak działa',
      'kiedy efekty',
      'trwałość efektów',
    ],
    preparation: [
      'przygotowanie',
      'jak przygotować się',
      'przed zabiegiem',
      'czego nie robić przed',
    ],
    aftercare: [
      'zalecenia po',
      'po zabiegu',
      'pielęgnacja po',
      'czego nie robić po',
    ],
    safety: [
      'czy boli',
      'czy bezpieczne',
      'przeciwwskazania',
      'skutki uboczne',
      'ciąża',
      'karmienie piersią',
      'wrażliwa skóra',
    ],
    comparison: [
      'vs',
      'czy lepsze',
      'różnice',
      'porównanie',
      'alternatywy',
      'zamiast',
    ],
    audience: [
      'dla kobiet',
      'dla mężczyzn',
      'dla nastolatków',
      'dla skóry wrażliwej',
      'dla ciemnych włosów',
      'dla jasnych włosów',
    ],
    proof: [
      'przed i po',
      'opinie klientów',
      'zdjęcia',
      'metamorfozy',
      'certyfikat',
      'urządzenie',
    ],
    faq: [
      'najczęstsze pytania',
      'pytania i odpowiedzi',
      'faq',
    ],
  },
};

const ENGLISH_EXPANSION: LanguageExpansionSet = {
  patterns: ENGLISH_PATTERNS,
  prepositions: {
    in: 'in',
    near: 'near',
    for: 'for',
    with: 'with',
    without: 'without',
  },
  modifiers: {
    price: [
      'price',
      'cost',
      'pricing',
      'how much does it cost',
      'offers',
      'package',
      'cheap',
    ],
    commercial: [
      'clinic',
      'salon',
      'provider',
      'best',
      'reviews',
      'ranking',
      'booking',
      'consultation',
      'appointment',
    ],
    local: [
      'near me',
      'city centre',
      'nearby',
      'local',
    ],
    informational: [
      'results',
      'is it worth it',
      'how it works',
      'how long does it take',
      'how many sessions',
      'when results',
      'how long results last',
    ],
    preparation: [
      'preparation',
      'how to prepare',
      'before treatment',
      'what to avoid before',
    ],
    aftercare: [
      'aftercare',
      'after treatment',
      'care after',
      'what to avoid after',
    ],
    safety: [
      'does it hurt',
      'is it safe',
      'contraindications',
      'side effects',
      'pregnancy',
      'breastfeeding',
      'sensitive skin',
    ],
    comparison: [
      'vs',
      'better than',
      'differences',
      'comparison',
      'alternatives',
      'instead of',
    ],
    audience: [
      'for women',
      'for men',
      'for teenagers',
      'for sensitive skin',
      'for dark hair',
      'for light hair',
    ],
    proof: [
      'before and after',
      'customer reviews',
      'photos',
      'case studies',
      'certificate',
      'device',
    ],
    faq: [
      'frequently asked questions',
      'questions and answers',
      'faq',
    ],
  },
};

export class TopicUniverseDemandProvider implements DemandProviderAdapter {
  readonly providerKey = 'topic_universe';
  readonly sourceTier = 'fallback';

  async discover(request: DemandDiscoveryRequest): Promise<DemandProviderResult> {
    const seed = normalizeKeyword(request.topicSeed);
    if (!seed) {
      return { observations: [] };
    }

    const expansion = expansionFor(request.language);
    const patterns = expansion.patterns;
    const vocabulary = (request.manualSeeds ?? [])
      .map((value) => normalizeKeyword(value))
      .filter((value) => value.length > 0 && value !== seed);
    const queries = unique([
      seed,
      ...patterns.flatMap((pattern) => pattern.build(seed)),
      ...geoQueries(seed, request.geo?.city),
      ...modifierQueries(seed, expansion),
      ...combinationQueries(seed, expansion),
      ...vocabularyQueries(seed, vocabulary, expansion),
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

function modifierQueries(seed: string, expansion: LanguageExpansionSet): string[] {
  return Object.values(expansion.modifiers).flatMap((modifiers) =>
    modifiers.map((modifier) => `${seed} ${modifier}`),
  );
}

function combinationQueries(seed: string, expansion: LanguageExpansionSet): string[] {
  const modifiers = expansion.modifiers;
  return [
    ...cross(seed, modifiers.price, modifiers.commercial),
    ...cross(seed, modifiers.price, modifiers.audience),
    ...cross(seed, modifiers.price, modifiers.proof),
    ...cross(seed, modifiers.commercial, modifiers.proof),
    ...cross(seed, modifiers.safety, modifiers.audience),
    ...cross(seed, modifiers.informational, modifiers.proof),
    ...cross(seed, modifiers.comparison, modifiers.commercial),
    ...cross(seed, modifiers.preparation, modifiers.safety),
    ...cross(seed, modifiers.aftercare, modifiers.safety),
  ];
}

function cross(seed: string, left: string[], right: string[]): string[] {
  return left.slice(0, 5).flatMap((leftModifier) =>
    right.slice(0, 5).map((rightModifier) =>
      `${seed} ${leftModifier} ${rightModifier}`,
    ),
  );
}

function vocabularyQueries(
  seed: string,
  vocabulary: string[],
  expansion: LanguageExpansionSet,
): string[] {
  return unique(vocabulary
    .flatMap((value) => [
      `${seed} ${value}`,
      `${value} ${seed}`,
      `${seed} ${expansion.prepositions.with} ${value}`,
      `${seed} ${expansion.prepositions.for} ${value}`,
      ...expansion.modifiers.price.slice(0, 3).map((modifier) =>
        `${seed} ${value} ${modifier}`,
      ),
      ...expansion.modifiers.commercial.slice(0, 3).map((modifier) =>
        `${seed} ${value} ${modifier}`,
      ),
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

function expansionFor(language: string | undefined): LanguageExpansionSet {
  return language?.toLowerCase().startsWith('pl')
    ? POLISH_EXPANSION
    : ENGLISH_EXPANSION;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => normalizeKeyword(value)).filter(Boolean))];
}
