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
  SiteBlueprintLaunchReadiness,
  SiteBlueprintPage,
  SiteBlueprintStaticExportKit,
  SiteBlueprintWorkspacePlan,
  SiteGenerationPackage,
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
    return buildSiteBlueprint(await this.loadInput(topicId));
  }

  async buildGenerationPackageForTopic(topicId: string): Promise<SiteGenerationPackage> {
    return buildSiteGenerationPackage(await this.loadInput(topicId));
  }

  private async loadInput(topicId: string): Promise<BuildSiteBlueprintInput> {
    const generatedAt = new Date().toISOString();
    const [topic, candidatePages, seoPacks] = await Promise.all([
      this.topics.get(topicId),
      this.demand.listCandidatePages(topicId),
      this.seoPacks.listSeoPacks(topicId),
    ]);

    return {
      topic,
      candidatePages,
      seoPacks,
      generatedAt,
    };
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
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  return {
    topicId: input.topic.id,
    topicSlug: input.topic.slug,
    topicName: input.topic.name,
    generatedAt,
    language: topicLanguage(input.topic),
    geo: topicGeo(input.topic),
    deployment: {
      target: 'cloudflare_pages',
      framework: 'nextjs',
      outputMode: 'static_first',
      buildCommand: 'npx next build',
      buildDirectory: 'out',
      nextConfig: {
        output: 'export',
        trailingSlash: true,
        imagesUnoptimized: true,
      },
      constraints: [
        'Use Next.js static export for Cloudflare Pages unless the Product Owner approves a Workers/vinext runtime.',
        'Flag server-only runtime requirements before site implementation.',
        'Do not use route handlers, server actions, middleware or runtime image optimization in static-first output.',
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
    workspacePlan: workspacePlan(pages),
    staticExportKit: staticExportKit(input.topic, pages, generatedAt),
    launchReadiness: launchReadiness(pages, warnings),
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

export function buildSiteGenerationPackage(
  input: BuildSiteBlueprintInput,
): SiteGenerationPackage {
  const blueprint = buildSiteBlueprint(input);
  const includedCandidateKeys = new Set(
    blueprint.pages.map((page) => page.seoPack.candidateKey),
  );
  const packsByKey = latestSeoPacksByCandidateKey(input.seoPacks);
  const seoPacks = [...includedCandidateKeys]
    .map((candidateKey) => packsByKey.get(candidateKey))
    .filter((pack): pack is SeoPackRecord => Boolean(pack));
  const missingSeoPackCandidateKeys = blueprint.pages
    .filter((page) => page.seoPack.status === 'needed')
    .map((page) => page.seoPack.candidateKey);
  const warnings = [
    ...blueprint.warnings,
    ...missingSeoPackCandidateKeys.map((candidateKey) =>
      `Missing SEO Pack for ${candidateKey}.`,
    ),
  ];

  return {
    generatedAt: blueprint.generatedAt,
    blueprint,
    seoPacks,
    missingSeoPackCandidateKeys,
    warnings: unique(warnings),
    degraded: blueprint.degraded || missingSeoPackCandidateKeys.length > 0,
  };
}

function launchReadiness(
  pages: SiteBlueprintPage[],
  blueprintWarnings: string[],
): SiteBlueprintLaunchReadiness {
  const generatePages = pages.filter((page) => page.recommendation === 'create');
  const missingSeoPacks = pages.filter((page) =>
    page.seoPack.status === 'needed',
  );
  const degradedSeoPacks = pages.filter((page) =>
    page.seoPack.degraded === true,
  );
  const evidenceGaps = pages.flatMap((page) =>
    page.missingResearchGaps.map((gap) => `${page.routePath}: ${gap}`),
  );
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (generatePages.length === 0) {
    blockers.push('No create-ready page tasks are available.');
  }
  if (missingSeoPacks.length > 0) {
    warnings.push(`${missingSeoPacks.length} included pages are missing SEO Packs.`);
  }
  if (degradedSeoPacks.length > 0) {
    warnings.push(`${degradedSeoPacks.length} included pages have degraded SEO Packs.`);
  }
  if (evidenceGaps.length > 0) {
    warnings.push(`${evidenceGaps.length} included page evidence gaps remain.`);
  }
  warnings.push(...blueprintWarnings.filter((warning) =>
    !warning.startsWith('No create-ready pages'),
  ));

  const status = blockers.length > 0
    ? 'blocked'
    : warnings.length > 0
      ? 'degraded_ready'
      : 'ready';

  return {
    status,
    canGenerateStaticSite: blockers.length === 0,
    canPublishWithoutReview: status === 'ready',
    blockers,
    warnings: unique(warnings),
    nextActions: nextActionsForLaunch(status, {
      missingSeoPackCount: missingSeoPacks.length,
      degradedSeoPackCount: degradedSeoPacks.length,
      evidenceGapCount: evidenceGaps.length,
    }),
  };
}

function nextActionsForLaunch(
  status: SiteBlueprintLaunchReadiness['status'],
  counts: {
    missingSeoPackCount: number;
    degradedSeoPackCount: number;
    evidenceGapCount: number;
  },
): string[] {
  if (status === 'blocked') {
    return [
      'Run or wait for Topic Work Run until Demand page planning produces create-ready candidates.',
      'Inspect Demand candidate pages and SERP provider status if no page tasks become creatable.',
    ];
  }

  const actions: string[] = [
    'Generate static Next.js routes for workspacePlan.pageTasks where action=generate.',
    'Use action=merge tasks as page sections, FAQs and internal-link context.',
  ];
  if (counts.missingSeoPackCount > 0) {
    actions.push('Generate missing SEO Packs before publishing production copy.');
  }
  if (counts.degradedSeoPackCount > 0 || counts.evidenceGapCount > 0) {
    actions.push('Keep uncertainty visible in the launch report and request review before publishing.');
  }
  if (status === 'ready') {
    actions.push('Run static export build and prepare Cloudflare Pages deployment.');
  }
  return actions;
}

function staticExportKit(
  topic: TopicRecord,
  pages: SiteBlueprintPage[],
  generatedAt: string,
): SiteBlueprintStaticExportKit {
  return {
    files: [
      {
        path: 'next.config.ts',
        contentType: 'typescript',
        overwritePolicy: 'manual_merge',
        content: [
          "import type { NextConfig } from 'next';",
          '',
          'const nextConfig: NextConfig = {',
          "  output: 'export',",
          '  trailingSlash: true,',
          '  images: {',
          '    unoptimized: true,',
          '  },',
          '};',
          '',
          'export default nextConfig;',
          '',
        ].join('\n'),
      },
      {
        path: 'src/data/seo-site-blueprint.ts',
        contentType: 'typescript',
        overwritePolicy: 'create_or_update',
        content: siteBlueprintDataModule(topic, pages, generatedAt),
      },
      {
        path: 'public/robots.txt',
        contentType: 'text',
        overwritePolicy: 'manual_merge',
        content: [
          'User-agent: *',
          'Allow: /',
          '',
          'Sitemap: /sitemap.xml',
          '',
        ].join('\n'),
      },
    ],
    notes: [
      'Write static pages from workspacePlan.pageTasks where action=generate.',
      'Use action=merge tasks as supporting sections, FAQs or internal-link context for broader pages.',
      'Keep the blueprint data snapshot committed with the generated site so launch decisions are auditable.',
      'Merge next.config.ts and robots.txt carefully when the target workspace already has project-specific settings.',
    ],
  };
}

function siteBlueprintDataModule(
  topic: TopicRecord,
  pages: SiteBlueprintPage[],
  generatedAt: string,
): string {
  const payload = {
    topic: {
      id: topic.id,
      slug: topic.slug,
      name: topic.name,
      language: topicLanguage(topic),
      geo: topicGeo(topic),
    },
    generatedAt,
    routes: pages.map((page) => ({
      path: page.routePath,
      titleConcept: page.titleConcept,
      primaryKeyword: page.primaryKeyword,
      supportingKeywords: page.supportingKeywords,
      pageType: page.pageType,
      generationProfile: page.generationProfile,
      recommendation: page.recommendation,
      role: page.role,
      priorityScore: page.priorityScore,
      clusterKey: page.clusterKey,
      clusterLabel: page.clusterLabel,
      primaryIntent: page.primaryIntent,
      seoPackId: page.seoPack.packId,
      seoPackStatus: page.seoPack.status,
      internalLinks: page.internalLinks,
      warnings: page.warnings,
    })),
  };

  return [
    'export const seoSiteBlueprint = ',
    JSON.stringify(payload, null, 2),
    ' as const;',
    '',
    'export type SeoSiteBlueprint = typeof seoSiteBlueprint;',
    'export type SeoSiteRoute = SeoSiteBlueprint["routes"][number];',
    '',
  ].join('\n');
}

function workspacePlan(pages: SiteBlueprintPage[]): SiteBlueprintWorkspacePlan {
  return {
    targetWorkspace: {
      framework: 'nextjs',
      deploymentTarget: 'cloudflare_pages',
      outputMode: 'static_first',
    },
    requiredFiles: [
      {
        path: 'next.config.ts',
        purpose: 'Configure static export with output: "export", trailingSlash: true and unoptimized images for Cloudflare Pages.',
        required: true,
      },
      {
        path: 'src/app/layout.tsx',
        purpose: 'Set site-wide metadata, language, navigation shell and shared structured-data boundary.',
        required: true,
      },
      {
        path: 'src/app/page.tsx',
        purpose: 'Build the homepage or primary commercial landing route from the highest-priority money page.',
        required: true,
      },
      {
        path: 'src/data/seo-site-blueprint.ts',
        purpose: 'Persist the consumed Site Blueprint snapshot so generated routes are auditable in the website repository.',
        required: true,
      },
      {
        path: 'src/lib/seo-pack.ts',
        purpose: 'Normalize SEO Pack data for page components without embedding SEO KB API calls in runtime pages.',
        required: true,
      },
      {
        path: 'public/robots.txt',
        purpose: 'Expose crawl policy for generated static pages.',
        required: true,
      },
      {
        path: 'src/app/sitemap.ts',
        purpose: 'Generate sitemap entries from Site Blueprint route paths when compatible with static export.',
        required: false,
      },
    ],
    pageTasks: pages.map((page) => ({
      routePath: page.routePath,
      appRouterFile: appRouterFileFor(page.routePath),
      sourceBlueprintPageSlug: page.slug,
      primaryKeyword: page.primaryKeyword,
      seoPackId: page.seoPack.packId,
      seoPackStatus: page.seoPack.status,
      action: page.recommendation === 'create'
        ? 'generate'
        : page.recommendation === 'merge'
          ? 'merge'
          : 'defer',
      blockingWarnings: page.warnings.filter((warning) =>
        warning.includes('SEO Pack has not been generated') ||
        warning.includes('degraded') ||
        warning.includes('Missing research evidence'),
      ),
    })),
    launchChecklist: [
      'Consume the latest Site Blueprint through MCP/API before editing website routes.',
      'Generate only pages with action=generate; use action=merge pages as supporting sections or internal-link context.',
      'Do not publish production copy for pages whose SEO Pack is missing unless the Product Owner explicitly accepts degraded output.',
      'Keep route paths, canonical URLs, sitemap entries and internal links aligned with the blueprint.',
      'Run local build and static export checks before Cloudflare Pages deployment.',
      'Record deployed URL, generated route count, missing SEO Packs and unresolved research gaps in the launch report.',
    ],
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

function appRouterFileFor(routePathValue: string): string {
  const segments = routePathValue
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 0) {
    return 'src/app/page.tsx';
  }
  return `src/app/${segments.join('/')}/page.tsx`;
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

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
