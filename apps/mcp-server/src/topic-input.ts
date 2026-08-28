export interface CreateTopicFromSeedArgs {
  seed: string;
  slug?: string;
  name?: string;
  description?: string | null;
  language?: string;
  countryCode?: string;
  regionCode?: string;
  maxResultsPerQuery?: number;
  maxPages?: number;
  seedUrls?: string[];
  sitemapUrls?: string[];
  allowedHosts?: string[];
}

export function buildTopicInput(args: CreateTopicFromSeedArgs): Record<string, unknown> {
  const seed = requiredText(args.seed, 'seed');
  const language = args.language?.trim() || 'en';
  const countryCode = args.countryCode?.trim().toUpperCase();
  const regionCode = args.regionCode?.trim().toUpperCase();
  const seedUrls = cleanList(args.seedUrls ?? []);
  const sitemapUrls = cleanList(args.sitemapUrls ?? []);
  const allowedHosts = cleanList(args.allowedHosts ?? []);
  const weightedTerms = terms(seed).slice(0, 12);

  return {
    slug: args.slug?.trim() || slugify(seed),
    name: args.name?.trim() || titleCase(seed),
    description: args.description ?? `SEO research topic for "${seed}".`,
    discovery: {
      schemaVersion: 1,
      search: {
        enabled: true,
        queries: [{
          text: seed,
          language,
          geo: countryCode
            ? {
                countryCode,
                ...(regionCode ? { regionCode } : {}),
              }
            : undefined,
        }],
        maxResultsPerQuery: boundedInteger(args.maxResultsPerQuery, 10, 1, 100),
      },
      sitemaps: {
        enabled: sitemapUrls.length > 0,
        urls: sitemapUrls,
      },
      seeds: {
        enabled: seedUrls.length > 0,
        urls: seedUrls,
      },
    },
    languageGeo: {
      languages: [{
        tag: language,
        role: 'primary',
        minimumConfidence: 0.8,
      }],
      geoTargets: countryCode
        ? [{
            countryCode,
            ...(regionCode ? { regionCode } : {}),
            priority: 100,
          }]
        : [],
      geoMode: countryCode ? 'targeted' : 'global',
    },
    crawlPolicy: {
      allowedHosts,
      deniedHosts: [],
      includedPathPatterns: ['/**'],
      excludedPathPatterns: [
        '/account/**',
        '/login/**',
        '/checkout/**',
        '/cart/**',
      ],
      ignoredQueryParameters: [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'fbclid',
        'gclid',
      ],
      crossHostCanonicalPolicy: 'same-host',
      maxDepth: 2,
      maxPages: boundedInteger(args.maxPages, 100, 1, 1_000_000),
      maxRequestsPerMinutePerHost: 10,
      maxConcurrentRequestsPerHost: 2,
      requestTimeoutMs: 30_000,
      maxResponseBytes: 10_485_760,
      allowedContentTypes: ['text/html'],
      robotsPolicy: 'strict',
      renderMode: 'auto',
      recrawlIntervalHours: 168,
      minRecrawlIntervalHours: 24,
      maxRecrawlIntervalHours: 720,
    },
    relevanceProfile: {
      minimumScore: 0.55,
      allowExploratoryCrawl: true,
      requiredTermGroups: weightedTerms.length > 0 ? [weightedTerms] : [],
      excludedTerms: [],
      weightedTerms: weightedTerms.map((term) => ({
        term,
        weight: 0.8,
      })),
      fieldWeights: {
        url: 0.15,
        title: 0.3,
        headings: 0.25,
        body: 0.2,
        anchorText: 0.1,
      },
      hostAdjustments: [],
    },
    intentProfile: {
      informational: 0.35,
      commercial: 0.45,
      navigational: 0.05,
      transactional: 0.15,
    },
  };
}

export function slugify(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/ł/gu, 'l')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .replace(/-{2,}/gu, '-')
    .slice(0, 80)
    .replace(/-+$/gu, '');
  return slug.length >= 3 ? slug : 'seo-topic';
}

function requiredText(value: string | undefined, field: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function boundedInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!Number.isInteger(value)) {
    return fallback;
  }
  const parsed = value as number;
  return Math.min(Math.max(parsed, min), max);
}

function cleanList(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function terms(seed: string): string[] {
  return cleanList(seed
    .toLowerCase()
    .split(/\s+/u)
    .map((term) => term.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((term) => term.length >= 2));
}

function titleCase(value: string): string {
  return value
    .split(/\s+/u)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
