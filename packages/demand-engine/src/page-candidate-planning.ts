import type {
  CandidatePage,
  DemandConfidence,
} from './domain/demand-engine-types';
import type { DemandCandidatePageRecord } from './persistence/demand-engine.repository';

export type PageCandidatePlanningRole =
  | 'money_page'
  | 'supporting_page'
  | 'merge_candidate'
  | 'reject';

export type PageCandidatePlanningRecommendation =
  | 'create'
  | 'merge'
  | 'defer'
  | 'reject';

export interface PageCandidatePlanningDecision {
  role: PageCandidatePlanningRole;
  recommendation: PageCandidatePlanningRecommendation;
  priorityScore: number;
  parentClusterKey: string;
  parentClusterLabel: string;
  reasons: string[];
  warnings: string[];
}

export type PlannedDemandCandidatePage<T extends CandidatePage = CandidatePage> =
  T & {
    planning: PageCandidatePlanningDecision;
  };

export interface PageCandidatePlanningCluster<T extends CandidatePage = CandidatePage> {
  clusterKey: string;
  clusterLabel: string;
  moneyPages: Array<PlannedDemandCandidatePage<T>>;
  supportingPages: Array<PlannedDemandCandidatePage<T>>;
  mergeCandidates: Array<PlannedDemandCandidatePage<T>>;
  rejectedCandidates: Array<PlannedDemandCandidatePage<T>>;
}

export interface PageCandidatePlan<T extends CandidatePage = CandidatePage> {
  summary: {
    total: number;
    createCount: number;
    mergeCount: number;
    deferCount: number;
    rejectCount: number;
    moneyPageCount: number;
    supportingPageCount: number;
    clusterCount: number;
  };
  clusters: Array<PageCandidatePlanningCluster<T>>;
  candidates: Array<PlannedDemandCandidatePage<T>>;
}

export function planCandidatePages<T extends CandidatePage>(
  pages: T[],
): PageCandidatePlan<T> {
  const candidates = normalizeMoneyPageRecommendations(
    pages
      .map((page) => ({
        ...page,
        planning: planningDecision(page),
      }))
      .sort(comparePlannedCandidates),
  );
  const clusters = [...groupBy(candidates, (page) =>
    page.planning.parentClusterKey,
  ).entries()]
    .map(([clusterKey, grouped]) => ({
      clusterKey,
      clusterLabel: grouped[0]?.planning.parentClusterLabel ?? clusterKey,
      moneyPages: grouped.filter((page) => page.planning.role === 'money_page'),
      supportingPages: grouped.filter((page) =>
        page.planning.role === 'supporting_page',
      ),
      mergeCandidates: grouped.filter((page) =>
        page.planning.role === 'merge_candidate',
      ),
      rejectedCandidates: grouped.filter((page) =>
        page.planning.role === 'reject',
      ),
    }))
    .sort((left, right) =>
      bestClusterScore(right) - bestClusterScore(left) ||
      left.clusterKey.localeCompare(right.clusterKey),
    );

  return {
    summary: {
      total: candidates.length,
      createCount: countByRecommendation(candidates, 'create'),
      mergeCount: countByRecommendation(candidates, 'merge'),
      deferCount: countByRecommendation(candidates, 'defer'),
      rejectCount: countByRecommendation(candidates, 'reject'),
      moneyPageCount: candidates.filter((page) =>
        page.planning.role === 'money_page',
      ).length,
      supportingPageCount: candidates.filter((page) =>
        page.planning.role === 'supporting_page',
      ).length,
      clusterCount: clusters.length,
    },
    clusters,
    candidates,
  };
}

export function creatablePlannedPages(
  pages: DemandCandidatePageRecord[],
): Array<PlannedDemandCandidatePage<DemandCandidatePageRecord>> {
  return planCandidatePages(pages).candidates.filter((page) =>
    page.planning.recommendation === 'create',
  );
}

function planningDecision(page: CandidatePage): PageCandidatePlanningDecision {
  const keyword = normalized(page.primaryKeyword);
  const categories = detectedCategories(page);
  const parent = parentCluster(page, categories);
  const warnings = planningWarnings(page, categories, keyword);
  const score = priorityScore(page, categories, warnings);
  const role = pageRole(page, categories, warnings, score);
  const recommendation = recommendationFor(page, role, categories, score, warnings);

  return {
    role,
    recommendation,
    priorityScore: score,
    parentClusterKey: parent.key,
    parentClusterLabel: parent.label,
    reasons: planningReasons(page, role, categories, score),
    warnings,
  };
}

function detectedCategories(page: CandidatePage): string[] {
  const haystack = normalized([
    page.primaryKeyword,
    page.primaryIntent,
    page.clusterKey,
    page.clusterLabel,
    page.proposedPageType,
  ].filter(Boolean).join(' ').replace(/_/gu, ' '));
  const categories: Array<[string, RegExp]> = [
    ['local', /\b(local|miasto|city|near me|nearby|jaslo|jasło)\b/u],
    ['price', /\b(price|pricing|cost|cena|cennik|koszt|ile kosztuje)\b/u],
    ['commercial', /\b(commercial|service|salon|gabinet|klinika|clinic|booking|termin|appointment)\b/u],
    ['comparison', /\b(comparison|compare|vs|versus|porownanie|porównanie|roznice|różnice|alternatyw|czy lepsze)\b/u],
    ['safety', /\b(safety|safe|contraindications|przeciwwskazania|skutki uboczne|bezpiecz|ciaza|ciąża|karmienie)\b/u],
    ['preparation', /\b(preparation|prepare|before|przygotowanie|przed zabiegiem|jak przygotowac|jak przygotować)\b/u],
    ['aftercare', /\b(aftercare|after|po zabiegu|zalecenia po|pielegnacja po|pielęgnacja po)\b/u],
    ['audience_men', /\b(men|male|meska|męska|mezczyzn|mężczyzn|dla mezczyzn|dla mężczyzn)\b/u],
    ['audience_women', /\b(women|female|kobiet|dla kobiet)\b/u],
    ['proof', /\b(proof|reviews|opinie|zdjecia|zdjęcia|before and after|przed i po|efekty)\b/u],
    ['faq', /\b(faq|question|questions|pytania|czy|jak|ile|kiedy|dlaczego)\b/u],
  ];

  return categories
    .filter(([, pattern]) => pattern.test(haystack))
    .map(([category]) => category);
}

function parentCluster(
  page: CandidatePage,
  categories: string[],
): { key: string; label: string } {
  if (categories.includes('price')) {
    return { key: 'pricing', label: 'Pricing' };
  }
  if (categories.includes('audience_men')) {
    return { key: 'men', label: 'Men' };
  }
  if (categories.includes('comparison')) {
    return { key: 'comparison', label: 'Comparison' };
  }
  if (categories.includes('safety')) {
    return { key: 'safety', label: 'Safety' };
  }
  if (categories.includes('proof')) {
    return { key: 'proof', label: 'Proof and effects' };
  }
  if (
    page.primaryIntent?.includes('preparation') ||
    page.primaryIntent?.includes('aftercare') ||
    categories.includes('preparation') ||
    categories.includes('aftercare') ||
    categories.includes('faq')
  ) {
    return { key: 'service-support', label: 'Service support' };
  }
  return { key: 'core-service', label: 'Core service' };
}

function planningWarnings(
  page: CandidatePage,
  categories: string[],
  keyword: string,
): string[] {
  const warnings: string[] = [];
  if (
    categories.includes('audience_men') &&
    /\b(ciaza|ciąża|pregnancy|karmienie|breastfeeding)\b/u.test(keyword)
  ) {
    warnings.push('Incompatible modifiers: male audience and pregnancy/breastfeeding.');
  }
  if (
    categories.includes('audience_men') &&
    categories.includes('audience_women')
  ) {
    warnings.push('Incompatible modifiers: male and female audience in one candidate.');
  }
  if (
    categories.length >= 3 &&
    modifierPenalty(page) > 0 &&
    metricStatus(page) === 'fallback_only' &&
    !hasSerpEvidence(page)
  ) {
    warnings.push('Mechanical multi-modifier candidate without validated SERP evidence.');
  }
  if (
    categories.length >= 3 &&
    modifierPenalty(page) > 0 &&
    metricStatus(page) === 'fallback_only' &&
    hasSerpEvidence(page)
  ) {
    warnings.push('Mechanical multi-modifier candidate should usually be merged into a broader page.');
  }
  if (
    page.proposedPageType === 'faq' &&
    !evidenceTypes(page).includes('faq_block') &&
    !evidenceTypes(page).includes('people_also_ask')
  ) {
    warnings.push('FAQ page lacks FAQ or People Also Ask evidence.');
  }
  return warnings;
}

function priorityScore(
  page: CandidatePage,
  categories: string[],
  warnings: string[],
): number {
  let score = 0;
  if (page.readiness === 'ready') {
    score += 35;
  } else if (page.readiness === 'partial') {
    score += 18;
  }
  score += confidenceScore(page.confidence);
  if (hasSerpEvidence(page)) {
    score += 18;
  }
  score += Math.min(page.evidenceUrls?.length ?? 0, 10);
  if (
    metricStatus(page) === 'provider_backed' ||
    metricStatus(page) === 'owned_data_backed'
  ) {
    score += 22;
  }
  if (categories.includes('local')) {
    score += 8;
  }
  if (categories.includes('price')) {
    score += 6;
  }
  if (categories.includes('preparation') || categories.includes('aftercare')) {
    score += 5;
  }
  if (warnings.some((warning) => warning.startsWith('Incompatible modifiers'))) {
    score -= 100;
  }
  if (warnings.some((warning) => warning.includes('Mechanical multi-modifier'))) {
    score -= 20;
  }
  if (warnings.some((warning) => warning.includes('FAQ page lacks'))) {
    score -= 10;
  }
  score -= modifierPenalty(page) * 8;
  return Math.max(0, score);
}

function pageRole(
  page: CandidatePage,
  categories: string[],
  warnings: string[],
  score: number,
): PageCandidatePlanningRole {
  if (warnings.some((warning) => warning.startsWith('Incompatible modifiers'))) {
    return 'reject';
  }
  if (warnings.some((warning) => warning.includes('Mechanical multi-modifier'))) {
    return 'merge_candidate';
  }
  if (score < 35) {
    return 'merge_candidate';
  }
  if (
    page.proposedPageType === 'guide' ||
    page.proposedPageType === 'faq' ||
    page.proposedPageType === 'comparison' ||
    categories.includes('preparation') ||
    categories.includes('aftercare') ||
    categories.includes('safety') ||
    categories.includes('proof') ||
    categories.includes('faq') ||
    categories.includes('comparison')
  ) {
    return 'supporting_page';
  }
  if (categories.includes('price') && categories.some((category) =>
    category.startsWith('audience_'),
  )) {
    return 'merge_candidate';
  }
  if (
    page.proposedPageType === 'local_page' ||
    categories.includes('price') ||
    categories.includes('audience_men') ||
    (categories.includes('commercial') && modifierPenalty(page) <= 1) ||
    (categories.includes('local') && modifierPenalty(page) === 0)
  ) {
    return 'money_page';
  }
  return 'supporting_page';
}

function recommendationFor(
  page: CandidatePage,
  role: PageCandidatePlanningRole,
  categories: string[],
  score: number,
  warnings: string[],
): PageCandidatePlanningRecommendation {
  if (role === 'reject') {
    return 'reject';
  }
  if (
    role === 'merge_candidate' ||
    warnings.some((warning) => warning.includes('should usually be merged'))
  ) {
    return 'merge';
  }
  if (
    role === 'supporting_page' &&
    !isStandaloneSupportIntent(page, categories)
  ) {
    return 'merge';
  }
  if (isCreatableEvidenceState(page, score)) {
    return 'create';
  }
  return 'defer';
}

function isCreatableEvidenceState(page: CandidatePage, score: number): boolean {
  if (page.readiness === 'ready' && score >= 45) {
    return true;
  }
  return page.readiness === 'partial' &&
    score >= 45 &&
    hasSerpEvidence(page) &&
    (page.evidenceUrls?.length ?? 0) >= 3;
}

function isStandaloneSupportIntent(
  page: CandidatePage,
  categories: string[],
): boolean {
  if (categories.includes('price') || categories.includes('proof')) {
    return false;
  }
  const supportIntentCount = [
    'preparation',
    'aftercare',
    'safety',
    'comparison',
    'faq',
  ].filter((category) => categories.includes(category)).length;
  if (supportIntentCount !== 1) {
    return false;
  }
  if (modifierPenalty(page) > 0) {
    return false;
  }
  return page.proposedPageType === 'guide' ||
    page.proposedPageType === 'faq' ||
    page.proposedPageType === 'comparison' ||
    supportIntentCount === 1;
}

function normalizeMoneyPageRecommendations<T extends CandidatePage>(
  pages: Array<PlannedDemandCandidatePage<T>>,
): Array<PlannedDemandCandidatePage<T>> {
  const grouped = groupBy(
    pages.filter((page) => page.planning.role === 'money_page'),
    (page) => page.planning.parentClusterKey,
  );
  const primaryMoneyPages = new Set(
    [...grouped.values()].flatMap((clusterPages) =>
      [...clusterPages].sort(compareCanonicalMoneyPage).slice(0, 1),
    ),
  );

  return pages.map((page) => {
    if (
      page.planning.role !== 'money_page' ||
      page.planning.recommendation !== 'create' ||
      primaryMoneyPages.has(page)
    ) {
      return page;
    }

    return {
      ...page,
      planning: {
        ...page.planning,
        role: 'merge_candidate' as const,
        recommendation: 'merge' as const,
        reasons: [
          ...page.planning.reasons,
          'Another broader money page is preferred for this parent cluster.',
        ],
        warnings: [
          ...page.planning.warnings,
          'Merged to avoid creating multiple thin money pages in one cluster.',
        ],
      },
    };
  }).sort(comparePlannedCandidates);
}

function compareCanonicalMoneyPage<T extends CandidatePage>(
  left: PlannedDemandCandidatePage<T>,
  right: PlannedDemandCandidatePage<T>,
): number {
  return modifierPenalty(left) - modifierPenalty(right) ||
    wordCount(left.primaryKeyword) - wordCount(right.primaryKeyword) ||
    right.planning.priorityScore - left.planning.priorityScore ||
    left.primaryKeyword.localeCompare(right.primaryKeyword);
}

function planningReasons(
  page: CandidatePage,
  role: PageCandidatePlanningRole,
  categories: string[],
  score: number,
): string[] {
  const reasons = [
    `Technical readiness is ${page.readiness ?? 'not_ready'}.`,
    `Planning role is ${role}.`,
    `Priority score is ${score}.`,
  ];
  if (categories.length > 0) {
    reasons.push(`Detected categories: ${categories.join(', ')}.`);
  }
  if (hasSerpEvidence(page)) {
    reasons.push('SERP evidence is attached.');
  }
  if (
    metricStatus(page) !== 'provider_backed' &&
    metricStatus(page) !== 'owned_data_backed'
  ) {
    reasons.push('Provider-backed demand metrics are not available.');
  }
  return reasons;
}

function modifierPenalty(page: CandidatePage): number {
  const keyword = normalized(page.primaryKeyword);
  const penalties: Array<[RegExp, number]> = [
    [/\bdla\b/u, 2],
    [/\b(salon|gabinet|klinika|clinic|provider)\b/u, 1],
    [/\b(najlepsz|best|ranking|opinie|reviews)\b/u, 1],
    [/\b(alternatyw|alternative)\b/u, 2],
    [/\b(cena|cennik|koszt)\b.*\b(cena|cennik|koszt)\b/u, 1],
    [/\b(ciemnych wlosow|ciemnych włosów|jasnych wlosow|jasnych włosów|skory wrazliwej|skóry wrażliwej)\b/u, 2],
  ];
  return penalties.reduce(
    (total, [pattern, penalty]) =>
      total + (pattern.test(keyword) ? penalty : 0),
    0,
  );
}

function wordCount(value: string): number {
  return normalized(value).split(/\s+/u).filter(Boolean).length;
}

function hasSerpEvidence(page: CandidatePage): boolean {
  return evidenceTypes(page).includes('serp_snippet') ||
    (page.evidenceUrls?.length ?? 0) > 0;
}

function metricStatus(page: CandidatePage): string {
  return page.metrics?.metricStatus ?? 'unknown';
}

function evidenceTypes(page: CandidatePage): string[] {
  return page.evidenceTypes ?? [];
}

function confidenceScore(confidence: DemandConfidence): number {
  return {
    unknown: 0,
    low: 5,
    medium: 12,
    high: 18,
  }[confidence];
}

function comparePlannedCandidates<T extends CandidatePage>(
  left: PlannedDemandCandidatePage<T>,
  right: PlannedDemandCandidatePage<T>,
): number {
  return recommendationRank(right.planning.recommendation) -
    recommendationRank(left.planning.recommendation) ||
    right.planning.priorityScore - left.planning.priorityScore ||
    left.primaryKeyword.localeCompare(right.primaryKeyword);
}

function recommendationRank(
  recommendation: PageCandidatePlanningRecommendation,
): number {
  return {
    reject: 0,
    defer: 1,
    merge: 2,
    create: 3,
  }[recommendation];
}

function bestClusterScore<T extends CandidatePage>(
  cluster: PageCandidatePlanningCluster<T>,
): number {
  return [
    ...cluster.moneyPages,
    ...cluster.supportingPages,
    ...cluster.mergeCandidates,
  ].reduce((score, page) => Math.max(score, page.planning.priorityScore), 0);
}

function countByRecommendation<T extends CandidatePage>(
  pages: Array<PlannedDemandCandidatePage<T>>,
  recommendation: PageCandidatePlanningRecommendation,
): number {
  return pages.filter((page) =>
    page.planning.recommendation === recommendation,
  ).length;
}

function groupBy<T>(
  values: T[],
  keyFor: (value: T) => string,
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const value of values) {
    const key = keyFor(value);
    grouped.set(key, [...(grouped.get(key) ?? []), value]);
  }
  return grouped;
}

function normalized(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '');
}
