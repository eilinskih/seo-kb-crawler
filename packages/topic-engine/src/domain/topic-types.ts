export type TopicStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface SearchQueryDefinition {
  text: string;
  language?: string;
  geo?: {
    countryCode: string;
    regionCode?: string;
  };
}

export interface DiscoveryConfiguration {
  schemaVersion: 1;
  search: {
    enabled: boolean;
    queries: SearchQueryDefinition[];
    maxResultsPerQuery: number;
  };
  sitemaps: {
    enabled: boolean;
    urls: string[];
  };
  seeds: {
    enabled: boolean;
    urls: string[];
  };
}

export interface LanguageTarget {
  tag: string;
  role: 'primary' | 'secondary';
  minimumConfidence: number;
}

export interface GeoTarget {
  countryCode: string;
  regionCode?: string;
  priority: number;
}

export interface LanguageGeoModel {
  languages: LanguageTarget[];
  geoTargets: GeoTarget[];
  geoMode: 'global' | 'targeted';
}

export interface CrawlPolicy {
  allowedHosts: string[];
  deniedHosts: string[];
  includedPathPatterns: string[];
  excludedPathPatterns: string[];
  ignoredQueryParameters: string[];
  crossHostCanonicalPolicy: 'same-host' | 'allowed-hosts';
  maxDepth: number;
  maxPages: number;
  maxRequestsPerMinutePerHost: number;
  maxConcurrentRequestsPerHost: number;
  requestTimeoutMs: number;
  maxResponseBytes: number;
  allowedContentTypes: string[];
  robotsPolicy: 'strict';
  renderMode: 'never' | 'auto' | 'always';
  recrawlIntervalHours: number;
  minRecrawlIntervalHours: number;
  maxRecrawlIntervalHours: number;
}

export interface WeightedTerm {
  term: string;
  weight: number;
}

export interface HostAdjustment {
  host: string;
  adjustment: number;
}

export interface RelevanceProfile {
  minimumScore: number;
  allowExploratoryCrawl: boolean;
  requiredTermGroups: string[][];
  excludedTerms: string[];
  weightedTerms: WeightedTerm[];
  fieldWeights: {
    url: number;
    title: number;
    headings: number;
    body: number;
    anchorText: number;
  };
  hostAdjustments: HostAdjustment[];
}

export interface IntentProfile {
  informational?: number;
  commercial?: number;
  navigational?: number;
  transactional?: number;
}

export interface TopicConfiguration {
  discovery: DiscoveryConfiguration;
  languageGeo: LanguageGeoModel;
  crawlPolicy: CrawlPolicy;
  relevanceProfile: RelevanceProfile;
  intentProfile: IntentProfile | null;
}

export interface TopicSnapshot extends TopicConfiguration {
  topicId: string;
  configurationVersion: number;
  crawlPolicyFingerprint: string;
  relevanceProfileFingerprint: string;
  createdAt: Date;
}

export interface TopicRecord extends TopicConfiguration {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: TopicStatus;
  configurationVersion: number;
  crawlPolicyFingerprint: string;
  relevanceProfileFingerprint: string;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  archivedAt: Date | null;
}

export interface CreateTopicInput extends TopicConfiguration {
  slug: string;
  name: string;
  description?: string | null;
}

export interface ReplaceTopicConfigurationInput extends TopicConfiguration {
  name?: string;
  description?: string | null;
  expectedConfigurationVersion: number;
}
