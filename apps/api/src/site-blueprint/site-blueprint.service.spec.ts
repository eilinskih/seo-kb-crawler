import type { DemandCandidatePageRecord } from '@seo-kb/demand-engine';
import type { SeoPackRecord } from '@seo-kb/seo-pack';
import type { TopicRecord } from '@seo-kb/topic-engine';
import {
  buildSiteBlueprint,
  buildSiteGenerationPackage,
} from './site-blueprint.service';

describe('buildSiteBlueprint', () => {
  it('builds a Cloudflare Pages site handoff from planned candidate pages', () => {
    const blueprint = buildSiteBlueprint({
      topic: topic(),
      candidatePages: [
        candidatePage({
          slug: 'depilacja-laserowa-jaslo',
          primaryKeyword: 'depilacja laserowa jaslo',
          proposedPageType: 'local_page',
          readiness: 'ready',
          evidenceUrls: ['https://example.com/local'],
        }),
        candidatePage({
          slug: 'depilacja-laserowa-cena',
          primaryKeyword: 'depilacja laserowa cena',
          proposedPageType: 'landing_page',
          readiness: 'partial',
        }),
      ],
      seoPacks: [seoPack('candidate:depilacja-laserowa-jaslo')],
      generatedAt: '2026-08-28T10:00:00.000Z',
    });

    expect(blueprint.deployment).toMatchObject({
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
    });
    expect(blueprint.pages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        routePath: '/depilacja-laserowa-jaslo',
        recommendation: 'create',
        seoPack: expect.objectContaining({
          candidateKey: 'candidate:depilacja-laserowa-jaslo',
          status: 'existing',
        }),
      }),
      expect.objectContaining({
        routePath: '/depilacja-laserowa-cena',
        seoPack: expect.objectContaining({
          status: 'needed',
        }),
      }),
    ]));
    expect(blueprint.summary.missingSeoPacks).toBe(1);
    expect(blueprint.sitemap.routePaths).toContain('/depilacja-laserowa-jaslo');
    expect(blueprint.workspacePlan).toMatchObject({
      targetWorkspace: {
        framework: 'nextjs',
        deploymentTarget: 'cloudflare_pages',
      },
      pageTasks: expect.arrayContaining([
        expect.objectContaining({
          routePath: '/depilacja-laserowa-jaslo',
          appRouterFile: 'src/app/depilacja-laserowa-jaslo/page.tsx',
          action: 'generate',
        }),
        expect.objectContaining({
          routePath: '/depilacja-laserowa-cena',
          appRouterFile: 'src/app/depilacja-laserowa-cena/page.tsx',
          seoPackStatus: 'needed',
        }),
      ]),
    });
    expect(blueprint.staticExportKit.files).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: 'next.config.ts',
        overwritePolicy: 'manual_merge',
        content: expect.stringContaining("output: 'export'"),
      }),
      expect.objectContaining({
        path: 'src/data/seo-site-blueprint.ts',
        overwritePolicy: 'create_or_update',
        content: expect.stringContaining('"generatedAt": "2026-08-28T10:00:00.000Z"'),
      }),
      expect.objectContaining({
        path: 'public/robots.txt',
      }),
    ]));
    expect(blueprint.launchReadiness).toMatchObject({
      status: 'degraded_ready',
      canGenerateStaticSite: true,
      canPublishWithoutReview: false,
      warnings: expect.arrayContaining([
        expect.stringContaining('missing SEO Packs'),
      ]),
      nextActions: expect.arrayContaining([
        expect.stringContaining('Generate missing SEO Packs'),
      ]),
    });
  });

  it('builds a one-call site generation package with included SEO Packs', () => {
    const generationPackage = buildSiteGenerationPackage({
      topic: topic(),
      candidatePages: [
        candidatePage({
          slug: 'depilacja-laserowa-jaslo',
          primaryKeyword: 'depilacja laserowa jaslo',
          proposedPageType: 'local_page',
          readiness: 'ready',
          evidenceUrls: ['https://example.com/local'],
        }),
        candidatePage({
          slug: 'depilacja-laserowa-cena',
          primaryKeyword: 'depilacja laserowa cena',
          readiness: 'partial',
        }),
      ],
      seoPacks: [
        seoPack('candidate:depilacja-laserowa-jaslo'),
        seoPack('candidate:unrelated'),
      ],
      generatedAt: '2026-08-28T10:00:00.000Z',
    });

    expect(generationPackage.seoPacks).toEqual([
      expect.objectContaining({
        candidateKey: 'candidate:depilacja-laserowa-jaslo',
      }),
    ]);
    expect(generationPackage.missingSeoPackCandidateKeys).toContain(
      'candidate:depilacja-laserowa-cena',
    );
    expect(generationPackage.workspaceExportFiles).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: 'src/data/seo-packs.ts',
        content: expect.stringContaining('"candidateKey": "candidate:depilacja-laserowa-jaslo"'),
      }),
    ]));
    expect(generationPackage.agentInstructions).toEqual(expect.arrayContaining([
      expect.stringContaining('canonical SEO input'),
      expect.stringContaining('Cloudflare Pages static export'),
      expect.stringContaining('request review before publishing'),
    ]));
    expect(generationPackage.degraded).toBe(true);
  });
});

function topic(): TopicRecord {
  return {
    id: '2cde7002-53e1-48dc-80b0-98a1b84fceb9',
    slug: 'depilacja-laserowa-jaslo',
    name: 'Depilacja laserowa Jaslo',
    description: null,
    status: 'active',
    configurationVersion: 1,
    discovery: {
      schemaVersion: 1,
      search: {
        enabled: true,
        queries: [{
          text: 'depilacja laserowa jaslo',
          language: 'pl',
          geo: { countryCode: 'PL' },
        }],
        maxResultsPerQuery: 10,
      },
      sitemaps: { enabled: false, urls: [] },
      seeds: { enabled: false, urls: [] },
    },
    languageGeo: {
      languages: [{ tag: 'pl', role: 'primary', minimumConfidence: 0.6 }],
      geoTargets: [{ countryCode: 'PL', priority: 1 }],
      geoMode: 'targeted',
    },
    crawlPolicy: {
      allowedHosts: [],
      deniedHosts: [],
      includedPathPatterns: [],
      excludedPathPatterns: [],
      ignoredQueryParameters: [],
      crossHostCanonicalPolicy: 'same-host',
      maxDepth: 1,
      maxPages: 100,
      maxRequestsPerMinutePerHost: 30,
      maxConcurrentRequestsPerHost: 2,
      requestTimeoutMs: 10_000,
      maxResponseBytes: 1_000_000,
      allowedContentTypes: ['text/html'],
      robotsPolicy: 'strict',
      renderMode: 'never',
      recrawlIntervalHours: 168,
      minRecrawlIntervalHours: 24,
      maxRecrawlIntervalHours: 720,
    },
    relevanceProfile: {
      minimumScore: 0.5,
      allowExploratoryCrawl: true,
      requiredTermGroups: [],
      excludedTerms: [],
      weightedTerms: [],
      fieldWeights: {
        url: 1,
        title: 1,
        headings: 1,
        body: 1,
        anchorText: 1,
      },
      hostAdjustments: [],
    },
    intentProfile: null,
    crawlPolicyFingerprint: 'crawl',
    relevanceProfileFingerprint: 'relevance',
    createdAt: new Date('2026-08-28T09:00:00.000Z'),
    updatedAt: new Date('2026-08-28T09:00:00.000Z'),
    activatedAt: new Date('2026-08-28T09:00:00.000Z'),
    archivedAt: null,
  };
}

function candidatePage(
  overrides: Partial<DemandCandidatePageRecord>,
): DemandCandidatePageRecord {
  return {
    id: `page-${overrides.slug ?? 'seed'}`,
    keywordCandidateId: `keyword-${overrides.slug ?? 'seed'}`,
    topicId: '2cde7002-53e1-48dc-80b0-98a1b84fceb9',
    slug: overrides.slug ?? 'seed',
    primaryKeyword: overrides.primaryKeyword ?? 'seed',
    supportingKeywords: overrides.supportingKeywords ?? [],
    proposedPageType: overrides.proposedPageType ?? 'landing_page',
    confidence: overrides.confidence ?? 'medium',
    readiness: overrides.readiness ?? 'ready',
    primaryIntent: overrides.primaryIntent ?? 'commercial',
    clusterKey: overrides.clusterKey ?? overrides.slug ?? 'seed',
    clusterLabel: overrides.clusterLabel ?? overrides.primaryKeyword ?? 'seed',
    evidenceTypes: overrides.evidenceTypes ?? ['serp_snippet'],
    evidenceQuality: overrides.evidenceQuality ?? 'medium',
    evidenceUrls: overrides.evidenceUrls ?? [],
    metrics: overrides.metrics ?? {
      searchVolume: null,
      keywordDifficulty: null,
      cpc: null,
      trafficPotential: null,
      trend: null,
      seasonality: null,
      metricStatus: 'fallback_only',
      providerKey: null,
      collectedAt: null,
    },
    missingMetrics: overrides.missingMetrics ?? [
      'searchVolume',
      'keywordDifficulty',
    ],
    missingResearchGaps: overrides.missingResearchGaps ?? [],
    pageAction: overrides.pageAction ?? 'new',
    createdAt: '2026-08-28T09:00:00.000Z',
    updatedAt: '2026-08-28T09:00:00.000Z',
  };
}

function seoPack(candidateKey: string): SeoPackRecord {
  return {
    id: `seo-pack-${candidateKey}`,
    topicId: '2cde7002-53e1-48dc-80b0-98a1b84fceb9',
    candidateKey,
    degraded: false,
    createdAt: '2026-08-28T09:30:00.000Z',
  } as SeoPackRecord;
}
