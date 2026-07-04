import { CrawlCommandPayload, CrawlPolicySnapshot } from '@seo-kb/crawler';

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
  command: CrawlCommandPayload;
}

export interface UrlFrontierEntrySeed {
  id: string;
  topicId: string;
  topicConfigurationVersion: number;
  normalizedUrl: string;
  normalizedUrlHash: string;
  crawlPolicyFingerprint: string;
  crawlPolicy: CrawlPolicySnapshot;
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
