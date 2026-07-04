export type UrlFrontierCrawlStatus =
  | 'idle'
  | 'scheduled'
  | 'leased'
  | 'crawling'
  | 'succeeded'
  | 'failed_retryable'
  | 'failed_terminal';

export type UrlFrontierRelevanceDecision =
  | 'accepted'
  | 'rejected'
  | 'insufficient_evidence';

export interface UrlFrontierCrawlPolicySnapshot {
  userAgent: string;
  respectRobots: boolean;
  allowedHosts?: string[];
  deniedHosts?: string[];
  includedPathPatterns?: string[];
  excludedPathPatterns?: string[];
  crossHostCanonicalPolicy?: 'same-host' | 'allowed-hosts';
  requiresJavaScript?: boolean;
  requiresMarkdown?: boolean;
  requiresPlainText?: boolean;
  maxBodyBytes: number;
  maxRedirects: number;
  timeoutMs: number;
  maxOutgoingLinks: number;
  maxMediaAssets: number;
  recrawlIntervalHours?: number;
  minRecrawlIntervalHours?: number;
  maxRecrawlIntervalHours?: number;
}

export interface UrlFrontierCrawlCommandPayload {
  attemptId: string;
  frontierEntryId: string;
  topicId: string;
  topicConfigurationVersion: number;
  normalizedUrl: string;
  crawlPolicyFingerprint: string;
  leaseExpiresAt: Date | string;
  deadline: Date | string;
  policy: UrlFrontierCrawlPolicySnapshot;
}

export interface UrlFrontierLeaseOptions {
  leaseOwner: string;
  leaseDurationMs: number;
  now: Date;
  limit?: number;
}

export interface UrlFrontierLease {
  entryId: string;
  attemptId: string;
  leaseOwner: string;
  leaseExpiresAt: Date;
  command: UrlFrontierCrawlCommandPayload;
}

export interface UrlFrontierEntrySeed {
  id: string;
  topicId: string;
  topicConfigurationVersion: number;
  normalizedUrl: string;
  normalizedUrlHash: string;
  crawlPolicyFingerprint: string;
  crawlPolicy: UrlFrontierCrawlPolicySnapshot;
  priorityScore: number;
  relevanceScore?: number;
  relevanceDecision: UrlFrontierRelevanceDecision;
  relevanceExplanation?: Record<string, unknown>;
  relevanceProfileVersion?: number;
  nextCrawlAt: Date;
  now: Date;
}

export interface UrlFrontierRepository {
  upsertEntry(seed: UrlFrontierEntrySeed): Promise<void>;
  leaseNext(options: UrlFrontierLeaseOptions): Promise<UrlFrontierLease | null>;
  acknowledgeCrawling(attemptId: string, now: Date): Promise<boolean>;
}
