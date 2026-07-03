export type DiscoverySourceType =
  | 'search'
  | 'sitemap'
  | 'seed'
  | 'link'
  | 'operator';

export type DiscoveryRunStatus =
  | 'planned'
  | 'queued'
  | 'leased'
  | 'running'
  | 'completed'
  | 'partial'
  | 'failed_retryable'
  | 'failed_terminal'
  | 'cancelled';

export type DiscoveryFailureCategory =
  | 'rate_limited'
  | 'provider_unavailable'
  | 'network_timeout'
  | 'invalid_credentials'
  | 'invalid_response'
  | 'unsafe_target'
  | 'cancelled'
  | 'budget_exhausted'
  | 'internal_error';

export interface DiscoveryProviderCapabilities {
  supportsLanguage: boolean;
  supportsCountry: boolean;
  supportsRegion: boolean;
  supportsPagination: boolean;
  supportsResultRank: boolean;
  supportsResultSnippet: boolean;
  supportsFreshnessFilter: boolean;
  maximumPageSize: number;
}

export interface DiscoveryRunPlan {
  topicId: string;
  topicConfigurationVersion: number;
  sourceType: DiscoverySourceType;
  sourceKey: string;
  providerKey: string | null;
  runSequence: number;
  planningKey: string;
  configuration: DiscoveryRunConfiguration;
}

export type DiscoveryRunConfiguration =
  | SearchDiscoveryRunConfiguration
  | SitemapDiscoveryRunConfiguration
  | SeedDiscoveryRunConfiguration
  | LinkDiscoveryRunConfiguration
  | OperatorDiscoveryRunConfiguration;

export interface SearchDiscoveryRunConfiguration {
  sourceType: 'search';
  query: string;
  language?: string;
  geo?: {
    countryCode: string;
    regionCode?: string;
  };
  maxResults: number;
}

export interface SitemapDiscoveryRunConfiguration {
  sourceType: 'sitemap';
  sitemapUrl: string;
}

export interface SeedDiscoveryRunConfiguration {
  sourceType: 'seed';
  urls: string[];
}

export interface LinkDiscoveryRunConfiguration {
  sourceType: 'link';
  crawlAttemptId: string;
  referringUrl: string;
  links: ExtractedLinkInput[];
}

export interface OperatorDiscoveryRunConfiguration {
  sourceType: 'operator';
  urls: string[];
  reason: string;
}

export interface ExtractedLinkInput {
  href: string;
  resolvedUrl: string;
  anchorText?: string;
  rel?: string[];
  sourceElement?: string;
  position?: number;
  metadata?: Record<string, unknown>;
}

export interface DiscoveryRunRecord {
  id: string;
  topicId: string;
  topicConfigurationVersion: number;
  sourceType: DiscoverySourceType;
  sourceKey: string;
  providerKey: string | null;
  status: DiscoveryRunStatus;
  checkpoint: Record<string, unknown> | null;
  attempt: number;
  observationsEmitted: number;
  itemsExamined: number;
  leaseOwner: string | null;
  leaseExpiresAt: Date | null;
  nextAttemptAt: Date | null;
  failureCategory: DiscoveryFailureCategory | null;
  failureDetail: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  planningKey: string;
  runSequence: number;
  configuration: DiscoveryRunConfiguration;
  createdAt: Date;
  updatedAt: Date;
}

export interface CandidateObservation {
  topicId: string;
  topicConfigurationVersion: number;
  discoveryRunId: string;
  sourceType: DiscoverySourceType;
  sourceKey: string;
  discoveredUrl: string;
  discoveredAt: Date;
  sourceUrl?: string;
  title?: string;
  snippet?: string;
  anchorText?: string;
  sourceRank?: number;
  metadata: Record<string, unknown>;
  idempotencyKey: string;
}

export type CandidateObservationReceiptStatus =
  | 'accepted'
  | 'duplicate'
  | 'malformed'
  | 'topic_snapshot_mismatch';

export interface CandidateObservationReceipt {
  idempotencyKey: string;
  status: CandidateObservationReceiptStatus;
}

export interface CandidateObservationSink {
  appendBatch(
    observations: CandidateObservation[],
  ): Promise<CandidateObservationReceipt[]>;
}

export interface DiscoveryExecutionContext {
  runId: string;
  attempt: number;
  topicId: string;
  topicConfigurationVersion: number;
  sourceType: DiscoverySourceType;
  sourceKey: string;
  configuration: DiscoveryRunConfiguration;
  checkpoint: Record<string, unknown> | null;
  deadline: Date;
  signal?: AbortSignal;
  credentialRef?: string;
}

export interface DiscoveryExecutionResult {
  status: 'completed' | 'partial' | 'failed_retryable' | 'failed_terminal';
  checkpoint: Record<string, unknown> | null;
  itemsExamined: number;
  observationsEmitted: number;
  failureCategory?: DiscoveryFailureCategory;
  failureDetail?: string;
}

export interface DiscoverySourceAdapter {
  readonly key: string;
  readonly sourceType: DiscoverySourceType;
  readonly capabilities: DiscoveryProviderCapabilities;

  execute(
    context: DiscoveryExecutionContext,
    sink: CandidateObservationSink,
  ): Promise<DiscoveryExecutionResult>;
}
