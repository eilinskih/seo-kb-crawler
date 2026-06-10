import { CreateTopicInput } from '../domain/topic-types';

export function validTopicInput(): CreateTopicInput {
  return {
    slug: 'technical-seo',
    name: 'Technical SEO',
    description: 'Technical SEO knowledge collection',
    discovery: {
      schemaVersion: 1,
      search: {
        enabled: true,
        queries: [{ text: 'technical seo', language: 'en' }],
        maxResultsPerQuery: 20,
      },
      sitemaps: { enabled: false, urls: [] },
      seeds: { enabled: false, urls: [] },
    },
    languageGeo: {
      languages: [
        { tag: 'en', role: 'primary', minimumConfidence: 0.8 },
      ],
      geoTargets: [],
      geoMode: 'global',
    },
    crawlPolicy: {
      allowedHosts: ['EXAMPLE.COM'],
      deniedHosts: [],
      includedPathPatterns: ['/**'],
      excludedPathPatterns: ['/account/**'],
      ignoredQueryParameters: ['utm_source'],
      crossHostCanonicalPolicy: 'same-host',
      maxDepth: 2,
      maxPages: 1000,
      maxRequestsPerMinutePerHost: 10,
      maxConcurrentRequestsPerHost: 2,
      requestTimeoutMs: 30000,
      maxResponseBytes: 10485760,
      allowedContentTypes: ['text/html'],
      robotsPolicy: 'strict',
      renderMode: 'auto',
      recrawlIntervalHours: 168,
      minRecrawlIntervalHours: 24,
      maxRecrawlIntervalHours: 720,
    },
    relevanceProfile: {
      minimumScore: 0.65,
      allowExploratoryCrawl: true,
      requiredTermGroups: [['seo', 'search engine optimization']],
      excludedTerms: [],
      weightedTerms: [{ term: 'crawler', weight: 0.8 }],
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
      informational: 0.7,
      commercial: 0.2,
      navigational: 0.1,
    },
  };
}
