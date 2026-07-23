export type ContentProcessingStatus =
  | 'pending'
  | 'processing'
  | 'processed'
  | 'failed_retryable'
  | 'failed_terminal'
  | 'skipped_duplicate';

export type ContentProcessingFailureCategory =
  | 'missing_body'
  | 'unsupported_content_type'
  | 'body_too_large'
  | 'parser_timeout'
  | 'artifact_storage_error'
  | 'database_error'
  | 'internal_error';

export interface ContentProcessingFailure {
  category: ContentProcessingFailureCategory;
  detail: string;
  retryable: boolean;
}

export interface DocumentIdentity {
  topicId: string;
  frontierEntryId: string;
}

export interface DocumentRecord extends DocumentIdentity {
  id: string;
  currentVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentVersionRecord {
  id: string;
  documentId: string;
  crawlAttemptId: string;
  topicId: string;
  frontierEntryId: string;
  topicConfigurationVersion: number;
  requestedUrl: string;
  finalUrl: string | null;
  canonicalUrl: string | null;
  title: string | null;
  metaDescription: string | null;
  contentHash: string | null;
  extractorVersion: string;
  rawHtml: string | null;
  cleanedMarkdown: string | null;
  plainText: string | null;
  metadata: DocumentMetadata;
  structuredData: StructuredDataObservation[];
  languageHints: LanguageHint[];
  geoHints: GeoHint[];
  createdAt: Date;
}

export interface ContentProcessingRecord {
  crawlAttemptId: string;
  documentId: string | null;
  documentVersionId: string | null;
  status: ContentProcessingStatus;
  failure: ContentProcessingFailure | null;
  extractorVersion: string;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrawlAttemptForProcessing {
  attemptId: string;
  frontierEntryId: string;
  topicId: string;
  topicConfigurationVersion: number;
  requestedUrl: string;
  status: 'succeeded';
  finalUrl: string | null;
  canonicalUrl: string | null;
  title: string | null;
  metaDescription: string | null;
  rawHtml: string | null;
  cleanedMarkdown: string | null;
  plainText: string | null;
  contentHash: string | null;
  headers: Record<string, string>;
  recordedAt: Date;
}

export interface ProcessCrawlAttemptCommand {
  crawlAttemptId: string;
  now: Date;
  extractorVersion?: string;
}

export interface ContentProcessingJobPayload {
  crawlAttemptId: string;
  extractorVersion?: string;
}

export interface ProcessCrawlAttemptResult {
  status: 'processed' | 'skipped_duplicate' | 'already_processed';
  documentId: string;
  documentVersionId: string | null;
}

export interface ContentProcessingRunCommand {
  crawlAttemptId: string;
  extractorVersion: string;
  now: Date;
}

export interface ContentProcessingFailureCommand
  extends ContentProcessingRunCommand {
  failure: ContentProcessingFailure;
}

export interface DocumentMetadata {
  headings: HeadingObservation[];
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  wordCount: number | null;
  characterCount: number | null;
  contentType: string | null;
  cacheHeaders: Record<string, string>;
  robotsMeta: string | null;
  canonicalUrl: string | null;
  hreflangLinks: Record<string, string>;
  publishedTime: string | null;
  updatedTime: string | null;
}

export interface HeadingObservation {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  position: number;
}

export interface StructuredDataObservation {
  format: 'json_ld' | 'microdata' | 'rdfa';
  data: unknown;
  position: number;
}

export interface LanguageHint {
  tag: string;
  confidence: number;
  source: 'html_lang' | 'meta' | 'content' | 'url';
}

export interface GeoHint {
  countryCode?: string;
  regionCode?: string;
  city?: string;
  confidence: number;
  source: 'url' | 'structured_data' | 'content' | 'metadata';
}

export interface ContentProcessingRepository {
  findSuccessfulCrawlAttempt(
    crawlAttemptId: string,
  ): Promise<CrawlAttemptForProcessing | null>;
  findPendingSuccessfulCrawlAttempts(options: {
    limit: number;
  }): Promise<CrawlAttemptForProcessing[]>;
  markProcessingPending(command: ContentProcessingRunCommand): Promise<void>;
  markProcessingStarted(command: ContentProcessingRunCommand): Promise<void>;
  markProcessingFailed(command: ContentProcessingFailureCommand): Promise<void>;
  findProcessingRecord(
    crawlAttemptId: string,
  ): Promise<ContentProcessingRecord | null>;
  processSuccessfulCrawlAttempt(
    attempt: CrawlAttemptForProcessing,
    options: {
      now: Date;
      extractorVersion: string;
    },
  ): Promise<ProcessCrawlAttemptResult>;
}

export interface ContentProcessingStatusSummary {
  totalRuns: number;
  counts: Array<{ status: ContentProcessingStatus; count: number }>;
  retryableFailures: number;
  terminalFailures: number;
  recentFailures: Array<{
    crawlAttemptId: string;
    status: ContentProcessingStatus;
    category: ContentProcessingFailureCategory;
    detail: string;
    retryable: boolean;
    updatedAt: string;
  }>;
}

export interface ContentInspectionSummary {
  recentDocuments: Array<{
    documentId: string;
    documentVersionId: string;
    topicId: string;
    requestedUrl: string;
    finalUrl: string | null;
    title: string | null;
    wordCount: number | null;
    createdAt: string;
  }>;
}
