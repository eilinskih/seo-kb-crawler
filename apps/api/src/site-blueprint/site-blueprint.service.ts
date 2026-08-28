import { Inject, Injectable } from '@nestjs/common';
import {
  DemandCandidatePageRecord,
  DemandEngineRepository,
  DEMAND_ENGINE_REPOSITORY,
  planCandidatePages,
  PlannedDemandCandidatePage,
} from '@seo-kb/demand-engine';
import {
  SEO_PACK_REPOSITORY,
  SeoPackProfileName,
  SeoPackRecord,
  SeoPackRepository,
} from '@seo-kb/seo-pack';
import { TopicRecord, TopicService } from '@seo-kb/topic-engine';
import {
  BuildSiteBlueprintInput,
  SiteBlueprint,
  SiteBlueprintInternalLink,
  SiteBlueprintPage,
} from './site-blueprint.types';

@Injectable()
export class SiteBlueprintService {
  constructor(
    private readonly topics: TopicService,
    @Inject(DEMAND_ENGINE_REPOSITORY)
    private readonly demand: DemandEngineRepository,
    @Inject(SEO_PACK_REPOSITORY)
    private readonly seoPacks: SeoPackRepository,
  ) {}

  async buildForTopic(topicId: string): Promise<SiteBlueprint> {
    const [topic, candidatePages, seoPacks] = await Promise.all([
      this.topics.get(topicId),
      this.demand.listCandidatePages(topicId),
      this.seoPacks.listSeoPacks(topicId),
    ]);

    return buildSiteBlueprint({
      topic,
      candidatePages,
      seoPacks,
      generatedAt: new Date().toISOString(),
    });
  }
}

export function buildSiteBlueprint(input: BuildSiteBlueprintInput): SiteBlueprint {
  const pagePlan = planCandidatePages(input.candidatePages);
  const latestSeoPacks = latestSeoPacksByCandidateKey(input.seoPacks);
  const includedCandidates = pagePlan.candidates
    .filter((page) => page.planning.recommendation !== 'reject')
    .slice(0, siteBlueprintPageLimit());
  const primaryTargets = includedCandidates
    .filter((page) =>
      page.planning.role === 'money_page' &&
      page.planning.recommendation === 'create',
    )
    .slice(0, 3);
  const fallbackTargets = includedCandidates
    .filter((page) => page.planning.recommendation === 'create')
    .slice(0, 3);
  const linkTargets = primaryTargets.length > 0 ? primaryTargets : fallbackTargets;
  const pages = includedCandidates.map((page) =>
    blueprintPage(page, latestSeoPacks, internalLinksFor(page, linkTargets)),
  );
  const missingSeoPacks = pages.filter((page) =>
    page.seoPack.status === 'needed',
  ).length;
  const warnings = blueprintWarnings(input.candidatePages, pages, missingSeoPacks);

  return {
    topicId: input.topic.id,
    topicSlug: input.topic.slug,
    topicName: input.topic.name,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    language: topicLanguage(input.topic),
    geo: topicGeo(input.topic),
    deployment: {
      target: 'cloudflare_pages',
      framework: 'nextjs',
      outputMode: 'static_first',
      buildCommand: 'npm run build',
      constraints: [
        'Prefer static routes and generated metadata compatible with Cloudflare Pages.',
        'Flag server-only runtime requirements before site implementation.',
        'Keep generated route paths deterministic so launch reports and indexing handoff can be audited.',
      ],
    },
    summary: {
      totalCandidatePages: input.candidatePages.length,
      includedPages: pages.length,
      creatablePages: pages.filter((page) => page.recommendation === 'create').length,
      mergePages: pages.filter((page) => page.recommendation === 'merge').length,
      deferredPages: pages.filter((page) => page.recommendation === 'defer').length,
      missingSeoPacks,
      existingSeoPacks: pages.length - missingSeoPacks,
    },
    navigation: pages
      .filter((page) =>
        page.role === 'money_page' ||
        (page.recommendation === 'create' && page.priorityScore >= 55),
      )
      .slice(0, 12)
      .map((page) => ({
        label: page.titleConcept,
        routePath: page.routePath,
        role: page.role,
      })),
    sitemap: {
      routePaths: pages
        .filter((page) => page.recommendation === 'create')
        .map((page) => page.routePath),
    },
    pages,
    warnings,
    degraded: warnings.length > 0 ||
      pages.some((page) =>
        page.readiness !== 'ready' ||
        page.seoPack.status === 'needed' ||
        page.seoPack.degraded === true,
      ),
  };
}

function blueprintPage(
  page: PlannedDemandCandidatePage<DemandCandidatePageRecord>,
  seoPacks: Map<string, SeoPackRecord>,
  internalLinks: SiteBlueprintInternalLink[],
): SiteBlueprintPage {
  const candidateKey = candidateKeyForPage(page);
  const seoPack = seoPacks.get(candidateKey) ?? null;
  const warnings = [
    ...page.planning.warnings,
    ...((page.missingResearchGaps ?? []).map((gap) =>
      `Missing research evidence: ${gap}.`,
    )),
  ];
  if (!seoPack) {
    warnings.push('SEO Pack has not been generated for this page candidate.');
  } else if (seoPack.degraded) {
    warnings.push('Existing SEO Pack is degraded and should be reviewed before production publishing.');
  }

  return {
    slug: page.slug,
    routePath: routePath(page.slug),
    titleConcept: titleCase(page.clusterLabel ?? page.primaryKeyword),
    primaryKeyword: page.primaryKeyword,
    supportingKeywords: page.supportingKeywords,
    pageType: page.proposedPageType,
    generationProfile: seoPackProfileForPage(page),
    readiness: page.readiness ?? 'not_ready',
    role: page.planning.role,
    recommendation: page.planning.recommendation,
    priorityScore: page.planning.priorityScore,
    clusterKey: page.planning.parentClusterKey,
    clusterLabel: page.planning.parentClusterLabel,
    primaryIntent: page.primaryIntent ?? null,
    evidenceUrls: page.evidenceUrls ?? [],
    missingMetrics: page.missingMetrics,
    missingResearchGaps: page.missingResearchGaps ?? [],
    seoPack: {
      candidateKey,
      status: seoPack ? 'existing' : 'needed',
      packId: seoPack?.id ?? null,
      degraded: seoPack?.degraded ?? null,
    },
    internalLinks,
    warnings,
  };
}

function latestSeoPacksByCandidateKey(packs: SeoPackRecord[]): Map<string, SeoPackRecord> {
  const latest = new Map<string, SeoPackRecord>();
  for (const pack of packs) {
    const existing = latest.get(pack.candidateKey);
    if (!existing || pack.createdAt.localeCompare(existing.createdAt) > 0) {
      latest.set(pack.candidateKey, pack);
    }
  }
  return latest;
}

function internalLinksFor(
  page: PlannedDemandCandidatePage<DemandCandidatePageRecord>,
  targets: Array<PlannedDemandCandidatePage<DemandCandidatePageRecord>>,
): SiteBlueprintInternalLink[] {
  return targets
    .filter((target) => target.slug !== page.slug)
    .slice(0, page.planning.role === 'money_page' ? 4 : 2)
    .map((target) => ({
      targetSlug: routePath(target.slug),
      anchorConcept: target.primaryKeyword,
      reason: page.planning.role === 'money_page'
        ? 'Connect the primary commercial page to closely related supporting opportunities.'
        : 'Support the canonical money page for this topic cluster.',
    }));
}

function blueprintWarnings(
  rawPages: DemandCandidatePageRecord[],
  pages: SiteBlueprintPage[],
  missingSeoPacks: number,
): string[] {
  const warnings: string[] = [];
  if (rawPages.length === 0) {
    warnings.push('No Demand candidate pages are available. Run Topic Work Run before building a site.');
  }
  if (pages.length === 0 && rawPages.length > 0) {
    warnings.push('All Demand candidate pages were rejected by the page planner.');
  }
  if (missingSeoPacks > 0) {
    warnings.push(`${missingSeoPacks} included page candidates are missing SEO Packs.`);
  }
  if (!pages.some((page) => page.recommendation === 'create')) {
    warnings.push('No create-ready pages are available for static site generation.');
  }
  if (rawPages.length > pages.length) {
    warnings.push(
      `${rawPages.length - pages.length} candidate pages were excluded from the blueprint by rejection or page limit.`,
    );
  }
  return warnings;
}

function topicLanguage(topic: TopicRecord): string | null {
  return topic.languageGeo.languages.find((language) =>
    language.role === 'primary',
  )?.tag ?? topic.discovery.search.queries[0]?.language ?? null;
}

function topicGeo(topic: TopicRecord): SiteBlueprint['geo'] {
  const geo = topic.discovery.search.queries[0]?.geo ?? topic.languageGeo.geoTargets[0];
  return {
    countryCode: geo?.countryCode ?? null,
    regionCode: geo?.regionCode ?? null,
  };
}

function candidateKeyForPage(page: DemandCandidatePageRecord): string {
  return `candidate:${slugify(page.primaryKeyword)}`;
}

function seoPackProfileForPage(page: DemandCandidatePageRecord): SeoPackProfileName {
  if (page.proposedPageType === 'faq') {
    return 'faq_page';
  }
  if (page.proposedPageType === 'comparison') {
    return 'comparison_page';
  }
  if (page.proposedPageType === 'local_page') {
    return 'local_page';
  }
  if (page.proposedPageType === 'guide') {
    return 'guide';
  }
  return 'landing_page';
}

function routePath(slug: string): string {
  const normalized = slug.trim().replace(/^\/+|\/+$/gu, '');
  return normalized ? `/${normalized}` : '/';
}

function titleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/gu, ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ł/gu, 'l')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '') || 'seed';
}

function siteBlueprintPageLimit(): number {
  const value = Number(process.env.SITE_BLUEPRINT_PAGE_LIMIT);
  return Number.isInteger(value) && value > 0 ? value : 100;
}
