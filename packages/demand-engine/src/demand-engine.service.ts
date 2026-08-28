import {
  CandidatePage,
  DemandConfidence,
  DemandDiscoveryRequest,
  DemandDiscoveryResult,
  DemandEvidenceQuality,
  DemandMetricSnapshot,
  DemandObservation,
  DemandProviderAdapter,
  KeywordCandidate,
} from './domain/demand-engine-types';
import { ManualFallbackDemandProvider } from './manual-fallback-demand.provider';
import { normalizeKeyword } from './normalize-keyword';
import { FreePhraseAnalysisProvider } from './phrase-analysis/free-phrase-analysis.provider';
import { PhraseAnalysisProvider } from './phrase-analysis/phrase-analysis-types';
import { TopicUniverseDemandProvider } from './topic-universe-demand.provider';

const UNKNOWN_METRICS: DemandMetricSnapshot = {
  searchVolume: null,
  keywordDifficulty: null,
  cpc: null,
  trafficPotential: null,
  trend: null,
  seasonality: null,
  metricStatus: 'unknown',
  providerKey: null,
  collectedAt: null,
};

export class DemandEngineService {
  constructor(
    private readonly providers: DemandProviderAdapter[] = [
      new TopicUniverseDemandProvider(),
      new ManualFallbackDemandProvider(),
    ],
    private readonly phraseAnalysisProvider: PhraseAnalysisProvider =
      new FreePhraseAnalysisProvider(),
  ) {}

  async discover(
    request: DemandDiscoveryRequest,
  ): Promise<DemandDiscoveryResult> {
    const normalizedTopic = normalizeKeyword(request.topicSeed);
    const observations: DemandObservation[] = [...(request.evidenceObservations ?? [])];
    const warnings: string[] = [];

    for (const provider of this.providers) {
      try {
        const result = await provider.discover(request);
        observations.push(...result.observations);
        warnings.push(...(result.warnings ?? []));
      } catch (error) {
        warnings.push(
          `${provider.providerKey} unavailable: ${errorMessage(error)}`,
        );
      }
    }

    const keywordCandidates = (await buildKeywordCandidates(
      observations,
      request,
      this.phraseAnalysisProvider,
    )).slice(0, request.limit ?? 100);

    return {
      normalizedTopic,
      fallbackMode: keywordCandidates.every((candidate) =>
        candidate.sourceTiers.every((tier) => tier === 'fallback'),
      ),
      warnings,
      observations,
      keywordCandidates,
      candidatePages: buildCandidatePages(keywordCandidates, request.topicSeed),
    };
  }
}

function buildKeywordCandidates(
  observations: DemandObservation[],
  request: DemandDiscoveryRequest,
  phraseAnalysisProvider: PhraseAnalysisProvider,
): Promise<KeywordCandidate[]> {
  const byKeyword = new Map<string, DemandObservation[]>();
  for (const observation of observations) {
    const normalized = normalizeKeyword(observation.observedText);
    if (!normalized) {
      continue;
    }
    byKeyword.set(normalized, [...(byKeyword.get(normalized) ?? []), observation]);
  }

  return Promise.all([...byKeyword.entries()]
    .map(async ([normalizedKeyword, grouped]) => {
      const metrics = mergeMetrics(grouped);
      const evidenceTypes = unique(grouped.map((observation) => observation.evidenceType));
      const evidenceQuality = aggregateObservationQuality(grouped);
      const phraseAnalysis = await phraseAnalysisProvider.analyze({
        phrase: normalizedKeyword,
        topicSeed: request.topicSeed,
        language: request.language,
        evidenceTypes,
      });
      return {
        normalizedKeyword,
        observedTexts: unique(grouped.map((observation) => observation.observedText)),
        language: request.language,
        geo: request.geo,
        sourceTiers: unique(grouped.map((observation) => observation.sourceTier)),
        providers: unique(grouped.map((observation) => observation.providerKey)),
        evidenceTypes,
        evidenceQuality,
        confidence: confidence(grouped, metrics),
        metrics,
        phraseAnalysis: {
          providerKey: phraseAnalysis.providerKey,
          candidateKind: phraseAnalysis.candidateKind,
          confidence: phraseAnalysis.confidence,
          entityEvidence: phraseAnalysis.entityEvidence?.map((evidence) => ({
            text: evidence.text,
            providerKey: evidence.providerKey,
            externalId: evidence.externalId,
            name: evidence.name,
            types: evidence.types,
            confidence: evidence.confidence,
          })),
          reasons: phraseAnalysis.reasons,
        },
      };
    }))
    .then((candidates) => candidates
    .sort((a, b) =>
      confidenceRank(b.confidence) - confidenceRank(a.confidence) ||
      b.evidenceTypes.length - a.evidenceTypes.length ||
      a.normalizedKeyword.localeCompare(b.normalizedKeyword),
    ));
}

function buildCandidatePages(
  candidates: KeywordCandidate[],
  topicSeed: string,
): CandidatePage[] {
  const clusters = new Map<string, KeywordCandidate[]>();
  for (const candidate of candidates.filter((candidate) =>
    isPageClusterCandidate(candidate, topicSeed),
  )) {
    const clusterKey = candidateClusterKey(candidate.normalizedKeyword);
    clusters.set(clusterKey, [...(clusters.get(clusterKey) ?? []), candidate]);
  }

  return [...clusters.entries()]
    .map(([, grouped]) => {
      const primary = grouped
        .sort((a, b) =>
          confidenceRank(b.confidence) - confidenceRank(a.confidence) ||
          b.evidenceTypes.length - a.evidenceTypes.length ||
          a.normalizedKeyword.length - b.normalizedKeyword.length,
        )[0];
      const cluster = classifyCandidate(primary.normalizedKeyword);
      const evidenceTypes = unique(grouped.flatMap((candidate) =>
        candidate.evidenceTypes,
      ));
      const evidenceQuality = aggregateCandidateEvidenceQuality(grouped);
      const confidenceValue = highestConfidence(grouped);
      return {
        slug: `/${cluster.slug}/`,
        primaryKeyword: primary.normalizedKeyword,
        supportingKeywords: grouped
          .map((candidate) => candidate.normalizedKeyword)
          .filter((keyword) => keyword !== primary.normalizedKeyword)
          .slice(0, 12),
        proposedPageType: cluster.pageType,
        confidence: confidenceValue,
        readiness: readiness(grouped, evidenceTypes, evidenceQuality),
        primaryIntent: cluster.intent,
        clusterKey: cluster.key,
        clusterLabel: cluster.label,
        evidenceTypes,
        evidenceQuality,
        evidenceUrls: [],
        metrics: primary.metrics,
        missingMetrics: missingMetrics(primary.metrics),
        missingResearchGaps: missingResearchGaps(grouped, evidenceTypes),
        phraseAnalysis: primary.phraseAnalysis,
        pageAction: 'new' as const,
      };
    })
    .sort((a, b) =>
      readinessRank(b.readiness) - readinessRank(a.readiness) ||
      confidenceRank(b.confidence) - confidenceRank(a.confidence) ||
      a.slug.localeCompare(b.slug),
    );
}

function isPageClusterCandidate(
  candidate: KeywordCandidate,
  topicSeed: string,
): boolean {
  return candidate.phraseAnalysis?.candidateKind === 'page_cluster' &&
    hasPageCandidateEvidence(candidate) &&
    hasPageCandidatePhraseShape(candidate.normalizedKeyword, topicSeed);
}

function hasPageCandidateEvidence(candidate: KeywordCandidate): boolean {
  return candidate.evidenceTypes.some((type) =>
    [
      'topic_seed',
      'autocomplete',
      'people_also_ask',
      'related_search',
      'serp_snippet',
      'competitor_title',
      'competitor_heading',
      'competitor_breadcrumb',
      'faq_block',
      'provider_keyword_metric',
    ].includes(type),
  );
}

function hasPageCandidatePhraseShape(keyword: string, topicSeed: string): boolean {
  const tokens = normalizedTokens(keyword);
  if (tokens.length < 2 || tokens.length > 7) {
    return false;
  }
  if (tokens.some((token) =>
    ['amp', 'nbsp', 'oacute', 'aacute', 'eacute', 'raquo'].includes(token),
  )) {
    return false;
  }
  const weakTerminalTokens = new Set([
    'a',
    'czesc',
    'część',
    'jak',
    'jest',
    'jestesmy',
    'jesteśmy',
    'marki',
    'musi',
    'pl',
    'po',
    'przez',
    's',
    'sa',
    'są',
    'stale',
    'tego',
    'to',
    'uklady',
    'układy',
    'uzyskuje',
    'wymaga',
    'wymagaja',
    'wymagają',
    'wybrac',
    'wybrać',
    'wylacznie',
    'wyłącznie',
    'wiedze',
    'wiedzę',
    'zwyzek',
    'zwyżek',
    'zgodnie',
  ]);
  if (weakTerminalTokens.has(tokens.at(-1) ?? '')) {
    return false;
  }
  return hasSeedObjectAnchor(tokens, normalizedTokens(topicSeed));
}

function normalizedTokens(value: string): string[] {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .split(/[^a-z0-9ąćęłńóśźż]+/iu)
    .filter(Boolean);
}

function hasSeedObjectAnchor(tokens: string[], seedTokens: string[]): boolean {
  if (seedTokens.length === 0) {
    return false;
  }
  const canonicalTokens = tokens.map(canonicalToken);
  const canonicalSeedTokens = seedTokens.map(canonicalToken);
  const fullOverlap = canonicalSeedTokens.filter((token) =>
    canonicalTokens.includes(token),
  ).length;
  if (fullOverlap >= Math.min(2, canonicalSeedTokens.length)) {
    return true;
  }
  return canonicalTokens[0] === canonicalSeedTokens[0];
}

function canonicalToken(value: string): string {
  if (value.length <= 4) {
    return value;
  }
  return value
    .replace(/(owego|owej|owych|ych|ich|ami|ach|owe|owa|owy|ego|iej|ie|em|om|ow|ą|a|e|i|y)$/u, '');
}

function classifyCandidate(keyword: string): {
  key: string;
  label: string;
  intent: string;
  pageType: CandidatePage['proposedPageType'];
  slug: string;
} {
  const categories = categoryKeys(keyword);
  if (categories.length >= 2) {
    return {
      key: `topic:${categories.join('-')}:${slugify(keyword)}`,
      label: titleCase(keyword),
      intent: categories.join('_'),
      pageType: categories.includes('comparison') ? 'comparison' : 'landing_page',
      slug: slugify(keyword),
    };
  }
  if (/\b(cena|cennik|koszt|ile kosztuje|price|cost|pricing)\b/u.test(keyword)) {
    return cluster('commercial_price', 'Commercial price', 'price', 'landing_page');
  }
  if (/\b(vs|czy lepsze|różnice|alternatyw|alternative|comparison|better)\b/u.test(keyword)) {
    return cluster('comparison', 'Comparison', 'comparison', 'comparison');
  }
  if (/(przeciwwskazania|skutki uboczne|bezpiecz|contraindications|side effects|safe)/u.test(keyword)) {
    return cluster('safety', 'Safety', 'safety', 'guide');
  }
  if (/(jak przygotowa[ćc]|przygotowanie|before|prepare)/u.test(keyword)) {
    return cluster('process_preparation', 'Preparation', 'informational_how_to', 'guide');
  }
  if (/(zalecenia po|aftercare|po zabiegu|after)/u.test(keyword)) {
    return cluster('process_aftercare', 'Aftercare', 'informational_how_to', 'guide');
  }
  if (/\b(czy|jak|ile|kiedy|dlaczego|does|is|how|when|why)\b/u.test(keyword)) {
    return cluster('informational_question', 'Question', 'informational_question', 'faq');
  }
  if (/\b(opinie|reviews|najlepsz|best|czy warto|worth)\b/u.test(keyword)) {
    return cluster('commercial_research', 'Commercial research', 'commercial_service', 'landing_page');
  }
  if (/\b(dla mężczyzn|mężczyzn|men|male)\b/u.test(keyword)) {
    return cluster('audience_men', 'Audience: men', 'audience', 'landing_page');
  }
  return {
    key: `topic:${slugify(keyword)}`,
    label: titleCase(keyword),
    intent: 'commercial_service',
    pageType: 'landing_page',
    slug: slugify(keyword),
  };
}

function candidateClusterKey(keyword: string): string {
  const classified = classifyCandidate(keyword);
  if (!classified.key.startsWith('topic:')) {
    return classified.key;
  }
  const categories = categoryKeys(keyword);
  const canonicalKey = canonicalKeywordKey(keyword);
  if (categories.length >= 2) {
    return `topic:${categories.join('-')}:${canonicalKey}`;
  }
  return `topic:${canonicalKey}`;
}

function canonicalKeywordKey(keyword: string): string {
  return normalizedTokens(keyword)
    .map(canonicalToken)
    .filter(Boolean)
    .join('-');
}

function categoryKeys(keyword: string): string[] {
  const categories: Array<[string, RegExp]> = [
    ['price', /\b(cena|cennik|koszt|ile kosztuje|price|cost|pricing|promocj|pakiet|offers?)\b/u],
    ['commercial', /\b(salon|gabinet|klinika|clinic|provider|booking|rezerwacj|konsultacj|termin|appointment)\b/u],
    ['research', /\b(opinie|ranking|reviews|best|najlepsz|czy warto|worth)\b/u],
    ['comparison', /\b(vs|czy lepsze|różnice|porównanie|alternatyw|comparison|better|instead)\b/u],
    ['safety', /(przeciwwskazania|skutki uboczne|bezpiecz|ciąża|karmienie|wrażliwa skóra|contraindications|side effects|safe|pregnancy|breastfeeding|sensitive skin)/u],
    ['preparation', /(jak przygotowa[ćc]|przygotowanie|przed zabiegiem|before treatment|prepare|preparation)/u],
    ['aftercare', /(zalecenia po|aftercare|po zabiegu|pielęgnacja po|after treatment|care after)/u],
    ['audience', /(dla kobiet|dla mężczyzn|dla nastolatków|dla skóry|dla ciemnych|dla jasnych|for women|for men|for teenagers|for sensitive|for dark|for light)/u],
    ['proof', /(przed i po|opinie klientów|zdjęcia|metamorfozy|certyfikat|urządzenie|before and after|customer reviews|photos|case studies|certificate|device)/u],
    ['faq', /\b(faq|najczęstsze pytania|pytania i odpowiedzi|frequently asked questions|questions and answers)\b/u],
  ];

  return categories
    .filter(([, pattern]) => pattern.test(keyword))
    .map(([category]) => category);
}

function cluster(
  key: string,
  label: string,
  intent: string,
  pageType: CandidatePage['proposedPageType'],
) {
  return {
    key,
    label,
    intent,
    pageType,
    slug: key.replace(/_/gu, '-'),
  };
}

function highestConfidence(candidates: KeywordCandidate[]): DemandConfidence {
  return candidates
    .map((candidate) => candidate.confidence)
    .sort((a, b) => confidenceRank(b) - confidenceRank(a))[0] ?? 'unknown';
}

function readiness(
  candidates: KeywordCandidate[],
  evidenceTypes: KeywordCandidate['evidenceTypes'],
  evidenceQuality: DemandEvidenceQuality,
): NonNullable<CandidatePage['readiness']> {
  const hasProviderOrOwnedEvidence = candidates.some((candidate) =>
    candidate.metrics.metricStatus === 'provider_backed' ||
    candidate.metrics.metricStatus === 'owned_data_backed',
  );
  const hasSerpEvidence = evidenceTypes.some((type) =>
    [
      'serp_snippet',
      'competitor_title',
      'competitor_meta',
      'competitor_heading',
      'competitor_anchor',
      'competitor_breadcrumb',
      'competitor_body_phrase',
      'faq_block',
    ].includes(type),
  );
  const hasExpansionEvidence = evidenceTypes.some((type) =>
    ['people_also_ask', 'related_search', 'autocomplete'].includes(type),
  );
  if (
    hasProviderOrOwnedEvidence ||
    evidenceQuality === 'strong' ||
    (hasSerpEvidence && hasExpansionEvidence && candidates.length >= 2)
  ) {
    return 'ready';
  }
  if (
    evidenceQuality === 'medium' ||
    hasSerpEvidence ||
    candidates.length >= 2 ||
    evidenceTypes.length >= 2
  ) {
    return 'partial';
  }
  return 'not_ready';
}

function missingResearchGaps(
  candidates: KeywordCandidate[],
  evidenceTypes: KeywordCandidate['evidenceTypes'],
): string[] {
  const gaps: string[] = [];
  if (!evidenceTypes.includes('serp_snippet')) {
    gaps.push('SERP validation evidence');
  }
  if (!evidenceTypes.includes('faq_block') && !evidenceTypes.includes('people_also_ask')) {
    gaps.push('FAQ or People Also Ask evidence');
  }
  if (aggregateCandidateEvidenceQuality(candidates) !== 'strong') {
    gaps.push('Strong SERP relevance evidence');
  }
  if (!candidates.some((candidate) =>
    candidate.metrics.metricStatus === 'provider_backed' ||
    candidate.metrics.metricStatus === 'owned_data_backed',
  )) {
    gaps.push('Provider-backed demand metrics');
  }
  return gaps;
}

function aggregateObservationQuality(
  observations: DemandObservation[],
): DemandEvidenceQuality {
  return highestEvidenceQuality(observations.map((observation) =>
    observation.evidenceQuality ?? defaultEvidenceQuality(observation),
  ));
}

function aggregateCandidateEvidenceQuality(
  candidates: KeywordCandidate[],
): DemandEvidenceQuality {
  return highestEvidenceQuality(candidates.map((candidate) =>
    candidate.evidenceQuality ?? 'weak',
  ));
}

function defaultEvidenceQuality(
  observation: DemandObservation,
): DemandEvidenceQuality {
  if (
    observation.metrics?.metricStatus === 'provider_backed' ||
    observation.metrics?.metricStatus === 'owned_data_backed'
  ) {
    return 'strong';
  }
  if (
    observation.evidenceType === 'people_also_ask' ||
    observation.evidenceType === 'related_search' ||
    observation.evidenceType === 'autocomplete'
  ) {
    return 'strong';
  }
  if (observation.evidenceType === 'serp_snippet' && observation.evidenceUrl) {
    return 'medium';
  }
  if (
    observation.evidenceType === 'competitor_title' ||
    observation.evidenceType === 'competitor_meta' ||
    observation.evidenceType === 'competitor_heading' ||
    observation.evidenceType === 'competitor_anchor' ||
    observation.evidenceType === 'competitor_breadcrumb' ||
    observation.evidenceType === 'competitor_body_phrase' ||
    observation.evidenceType === 'faq_block'
  ) {
    return 'medium';
  }
  return 'weak';
}

function highestEvidenceQuality(
  values: DemandEvidenceQuality[],
): DemandEvidenceQuality {
  return values.sort((a, b) => evidenceQualityRank(b) - evidenceQualityRank(a))[0] ?? 'weak';
}

function evidenceQualityRank(value: DemandEvidenceQuality): number {
  return {
    weak: 0,
    medium: 1,
    strong: 2,
  }[value];
}

function readinessRank(value: CandidatePage['readiness']): number {
  return {
    not_ready: 0,
    partial: 1,
    ready: 2,
  }[value ?? 'not_ready'];
}

function mergeMetrics(observations: DemandObservation[]): DemandMetricSnapshot {
  const providerMetric = observations.find((observation) =>
    observation.metrics?.metricStatus === 'provider_backed',
  );
  const ownedMetric = observations.find((observation) =>
    observation.metrics?.metricStatus === 'owned_data_backed',
  );
  const source = providerMetric ?? ownedMetric;
  if (!source?.metrics) {
    return {
      ...UNKNOWN_METRICS,
      metricStatus: observations.length > 0 ? 'fallback_only' : 'unknown',
      providerKey: observations[0]?.providerKey ?? null,
    };
  }
  return {
    ...UNKNOWN_METRICS,
    ...source.metrics,
    metricStatus: source.metrics.metricStatus ?? 'unknown',
    providerKey: source.providerKey,
  };
}

function confidence(
  observations: DemandObservation[],
  metrics: DemandMetricSnapshot,
): DemandConfidence {
  if (metrics.metricStatus === 'provider_backed' || metrics.metricStatus === 'owned_data_backed') {
    return 'high';
  }
  if (unique(observations.map((observation) => observation.evidenceType)).length >= 3) {
    return 'medium';
  }
  if (observations.length > 0) {
    return 'low';
  }
  return 'unknown';
}

function missingMetrics(metrics: DemandMetricSnapshot): string[] {
  return [
    ['searchVolume', metrics.searchVolume],
    ['keywordDifficulty', metrics.keywordDifficulty],
    ['cpc', metrics.cpc],
    ['trafficPotential', metrics.trafficPotential],
  ]
    .filter(([, value]) => value === null)
    .map(([key]) => String(key));
}

function confidenceRank(confidence: DemandConfidence): number {
  return {
    unknown: 0,
    low: 1,
    medium: 2,
    high: 3,
  }[confidence];
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function slugify(value: string): string {
  return normalizeKeyword(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/ł/gu, 'l')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '') || 'topic';
}

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/u)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
