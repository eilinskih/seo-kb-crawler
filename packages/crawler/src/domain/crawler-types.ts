export type CrawlAttemptStatus =
  | 'running'
  | 'succeeded'
  | 'failed_retryable'
  | 'failed_terminal'
  | 'timed_out'
  | 'blocked_by_policy'
  | 'cancelled';

export type CrawlerFailureCategory =
  | 'robots_denied'
  | 'unsafe_target'
  | 'policy_redirect_blocked'
  | 'dns_failure'
  | 'connection_failure'
  | 'network_timeout'
  | 'http_429'
  | 'http_5xx'
  | 'unsupported_content_type'
  | 'content_too_large'
  | 'decompression_limit'
  | 'browser_crash'
  | 'adapter_error'
  | 'cancelled'
  | 'internal_error';

export type CrawlerAdapterKey =
  | 'crawl4ai'
  | 'http-fetch'
  | 'playwright'
  | 'browserless'
  | 'wget'
  | string;

export interface CrawlPolicySnapshot {
  userAgent: string;
  respectRobots: boolean;
  requiresJavaScript?: boolean;
  requiresMarkdown?: boolean;
  requiresPlainText?: boolean;
  maxBodyBytes: number;
  maxRedirects: number;
  timeoutMs: number;
  maxOutgoingLinks: number;
  maxMediaAssets: number;
}

export interface CrawlCommand {
  attemptId: string;
  frontierEntryId: string;
  topicId: string;
  topicConfigurationVersion: number;
  normalizedUrl: string;
  crawlPolicyFingerprint: string;
  leaseExpiresAt: Date;
  deadline: Date;
  policy: CrawlPolicySnapshot;
}

export interface CrawlCommandPayload
  extends Omit<CrawlCommand, 'leaseExpiresAt' | 'deadline'> {
  leaseExpiresAt: Date | string;
  deadline: Date | string;
}

export interface RobotsDecision {
  allowed: boolean;
  checkedUrl: string;
  userAgent: string;
  evidence?: string;
  cacheKey?: string;
  crawlDelaySeconds?: number;
}

export interface RobotsPolicyOptions {
  respectRobots: boolean;
  userAgent: string;
  robotsTtlMs: number;
  failClosed: boolean;
  maxRobotsBytes: number;
  maxRedirects: number;
  maxResponseHeaderBytes: number;
}

export interface SafeNetworkRequest {
  url: string;
  method: 'GET' | 'HEAD';
  headers?: Record<string, string>;
  deadline: Date;
  signal: AbortSignal;
  maxBodyBytes: number;
  maxRedirects: number;
  maxResponseHeaderBytes: number;
}

export interface SafeNetworkResponse {
  finalUrl: string;
  statusCode: number;
  headers: Record<string, string>;
  body: Uint8Array;
  redirectChain: RedirectEvidence[];
}

export interface SafeNetworkGateway {
  fetch(request: SafeNetworkRequest): Promise<SafeNetworkResponse>;
}

export interface CrawlerAdapterCapabilities {
  supportsJavaScriptRendering: boolean;
  supportsMarkdownExtraction: boolean;
  supportsPlainTextExtraction: boolean;
  supportsScreenshot: boolean;
  supportsNetworkIdle: boolean;
  supportsRobotsAwareFetch: boolean;
  maximumBodyBytes: number;
  maximumExecutionMs: number;
}

export interface CrawlExecutionContext {
  command: CrawlCommand;
  robotsDecision: RobotsDecision;
  safeNetworkGateway: SafeNetworkGateway;
  deadline: Date;
  signal: AbortSignal;
}

export interface CrawlerAdapter {
  readonly key: CrawlerAdapterKey;
  readonly version: string;
  readonly capabilities: CrawlerAdapterCapabilities;

  crawl(context: CrawlExecutionContext): Promise<CrawlAdapterResult>;
}

export interface RedirectEvidence {
  fromUrl: string;
  toUrl: string;
  statusCode?: number;
}

export interface ExtractedCrawlLink {
  href: string;
  resolvedUrl: string;
  anchorText?: string;
  rel?: string[];
  sourceElement?: string;
  position?: number;
  metadata?: Record<string, unknown>;
}

export interface MediaAssetMetadata {
  resolvedUrl: string;
  elementType: string;
  altText?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  byteLength?: number;
  position?: number;
}

export interface CrawlTiming {
  dnsMs?: number;
  connectMs?: number;
  ttfbMs?: number;
  downloadMs?: number;
  renderMs?: number;
  extractionMs?: number;
  totalMs: number;
}

export interface CrawlFailure {
  category: CrawlerFailureCategory;
  detail: string;
  retryable: boolean;
}

export interface CrawlAdapterResult {
  status: CrawlAttemptStatus;
  finalUrl?: string;
  statusCode?: number;
  headers?: Record<string, string>;
  redirectChain?: RedirectEvidence[];
  canonicalUrl?: string;
  title?: string;
  metaDescription?: string;
  rawHtml?: string;
  cleanedMarkdown?: string;
  plainText?: string;
  outgoingLinks?: ExtractedCrawlLink[];
  mediaAssets?: MediaAssetMetadata[];
  timing: CrawlTiming;
  failure?: CrawlFailure;
}

export interface NormalizedCrawlResult
  extends Omit<CrawlAdapterResult, 'status' | 'headers' | 'failure'> {
  attemptId: string;
  frontierEntryId: string;
  topicId: string;
  topicConfigurationVersion: number;
  requestedUrl: string;
  status: CrawlAttemptStatus;
  headers: Record<string, string>;
  contentHash: string | null;
  adapter: {
    key: CrawlerAdapterKey;
    version: string;
  };
  failure: CrawlFailure | null;
}

export interface CrawlResultSink {
  append(result: NormalizedCrawlResult): Promise<void>;
}
