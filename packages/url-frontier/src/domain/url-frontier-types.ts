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

export type UrlFrontierDiscoverySourceType =
  | 'search'
  | 'sitemap'
  | 'seed'
  | 'link'
  | 'operator';

export type UrlFrontierCanonicalEvidenceType =
  | 'operator'
  | 'redirect'
  | 'http_link'
  | 'html_link';

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

export interface UrlFrontierDiscoveryObservation {
  topicId: string;
  topicConfigurationVersion: number;
  discoveryRunId: string;
  sourceType: UrlFrontierDiscoverySourceType;
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

export type UrlFrontierDiscoveryObservationReceiptStatus =
  | 'accepted'
  | 'duplicate'
  | 'malformed'
  | 'topic_snapshot_mismatch';

export interface UrlFrontierDiscoveryObservationReceipt {
  idempotencyKey: string;
  status: UrlFrontierDiscoveryObservationReceiptStatus;
  frontierEntryId: string | null;
}

export interface UrlFrontierPendingObservation
  extends UrlFrontierDiscoveryObservation {
  observationId: string;
  normalizedUrl: string;
  normalizedUrlHash: string;
}

export interface UrlFrontierCanonicalRelationCommand {
  sourceFrontierEntryId: string;
  targetCanonicalUrl: string;
  evidenceType: UrlFrontierCanonicalEvidenceType;
  evidence: Record<string, unknown>;
  now: Date;
}

export interface UrlFrontierCanonicalRelationResult {
  status:
    | 'consolidated'
    | 'recorded_unresolved'
    | 'rejected'
    | 'self_canonical';
  relationId: string | null;
  targetFrontierEntryId: string | null;
  reason: string | null;
}

export interface UrlFrontierRepository {
  upsertEntry(seed: UrlFrontierEntrySeed): Promise<void>;
  appendDiscoveryObservations(
    observations: UrlFrontierDiscoveryObservation[],
  ): Promise<UrlFrontierDiscoveryObservationReceipt[]>;
  leaseNext(options: UrlFrontierLeaseOptions): Promise<UrlFrontierLease | null>;
  acknowledgeCrawling(attemptId: string, now: Date): Promise<boolean>;
}

export interface UrlFrontierStatusCount {
  status: UrlFrontierCrawlStatus;
  count: number;
}

export interface UrlFrontierRecentEntry {
  id: string;
  topicId: string;
  normalizedUrl: string;
  crawlStatus: UrlFrontierCrawlStatus;
  relevanceDecision: UrlFrontierRelevanceDecision;
  priorityScore: number;
  nextCrawlAt: string;
  leaseOwner: string | null;
  consecutiveFailures: number;
  updatedAt: string;
}

export interface UrlFrontierStatusSummary {
  topicId: string | null;
  totalEntries: number;
  counts: UrlFrontierStatusCount[];
  retryableCount: number;
  recentEntries: UrlFrontierRecentEntry[];
}
