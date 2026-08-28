import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  UrlFrontierCrawlPolicySnapshot,
  UrlFrontierRecrawlReason,
} from '../domain/url-frontier-types';

export interface UrlFrontierCrawlFailure {
  category: string;
  detail: string;
  retryable: boolean;
}

export interface UrlFrontierCrawlResult {
  attemptId: string;
  frontierEntryId: string;
  topicId: string;
  topicConfigurationVersion: number;
  requestedUrl: string;
  status:
    | 'running'
    | 'succeeded'
    | 'failed_retryable'
    | 'failed_terminal'
    | 'timed_out'
    | 'blocked_by_policy'
    | 'cancelled';
  finalUrl?: string;
  statusCode?: number;
  headers: Record<string, string>;
  redirectChain?: unknown[];
  canonicalUrl?: string;
  title?: string;
  metaDescription?: string;
  rawHtml?: string;
  cleanedMarkdown?: string;
  plainText?: string;
  contentHash: string | null;
  outgoingLinks?: unknown[];
  mediaAssets?: unknown[];
  timing: unknown;
  adapter: {
    key: string;
    version: string;
  };
  failure: UrlFrontierCrawlFailure | null;
}

export interface CrawlAttemptRow {
  attempt_id: string;
  frontier_entry_id: string;
  topic_id: string;
  topic_configuration_version: number;
  requested_url: string;
  status: UrlFrontierCrawlResult['status'];
  final_url: string | null;
  status_code: number | null;
  headers: Record<string, string> | string;
  redirect_chain: unknown[] | string;
  canonical_url: string | null;
  title: string | null;
  meta_description: string | null;
  raw_html: string | null;
  cleaned_markdown: string | null;
  plain_text: string | null;
  content_hash: string | null;
  outgoing_links: unknown[] | string;
  media_assets: unknown[] | string;
  timing: unknown;
  adapter_key: string;
  adapter_version: string;
  failure: UrlFrontierCrawlFailure | string | null;
  recorded_at: Date;
  updated_at: Date;
}

export interface UrlFrontierCompletionUpdate {
  crawl_status: 'succeeded' | 'failed_retryable' | 'failed_terminal';
  active_attempt_id: null;
  lease_owner: null;
  lease_expires_at: null;
  last_crawled_at?: Date;
  next_crawl_at?: Date;
  freshness_score?: number;
  recrawl_reason?: UrlFrontierRecrawlReason;
  consecutive_failures?: number;
  incrementConsecutiveFailures: boolean;
  updated_at: Date;
}

export interface UrlFrontierRetryPolicy {
  baseBackoffMs: number;
  maxBackoffMs: number;
  maxRetryableFailures: number;
  jitterRatio: number;
}

export const DEFAULT_URL_FRONTIER_RETRY_POLICY: UrlFrontierRetryPolicy = {
  baseBackoffMs: 5 * 60 * 1000,
  maxBackoffMs: 6 * 60 * 60 * 1000,
  maxRetryableFailures: 5,
  jitterRatio: 0.1,
};

export interface UrlFrontierSuccessRecrawlPolicy {
  recrawlIntervalHours: number;
  minRecrawlIntervalHours: number;
  maxRecrawlIntervalHours: number;
}

export type UrlFrontierContentChangeSignal =
  | 'changed'
  | 'unchanged'
  | 'unknown';

export const DEFAULT_URL_FRONTIER_SUCCESS_RECRAWL_POLICY:
  UrlFrontierSuccessRecrawlPolicy = {
    recrawlIntervalHours: 168,
    minRecrawlIntervalHours: 24,
    maxRecrawlIntervalHours: 720,
  };

export const URL_FRONTIER_ADAPTIVE_RECRAWL_MULTIPLIERS: Record<
  UrlFrontierContentChangeSignal,
  number
> = {
  changed: 0.5,
  unchanged: 1.5,
  unknown: 1,
};

interface FrontierCompletionEntry {
  consecutive_failures: number;
  crawl_policy: UrlFrontierCrawlPolicySnapshot;
}

@Injectable()
export class UrlFrontierCompletionService {
  constructor(private readonly db: DbService) {}

  async complete(result: UrlFrontierCrawlResult): Promise<void> {
    const row = toCrawlAttemptRow(result, new Date());
    const { recorded_at: _recordedAt, ...retryUpdate } = row;
    await this.db.knex.transaction(async (transaction) => {
      await transaction<CrawlAttemptRow>('crawl_attempts')
        .insert(row)
        .onConflict('attempt_id')
        .merge(retryUpdate);

      const frontierEntry = await transaction<FrontierCompletionEntry>(
        'url_frontier_entries',
      )
        .select('consecutive_failures', 'crawl_policy')
        .where({
          id: result.frontierEntryId,
          active_attempt_id: result.attemptId,
        })
        .first();

      if (!frontierEntry) {
        return;
      }

      const previousSuccessfulAttempt = await transaction<CrawlAttemptRow>(
        'crawl_attempts',
      )
        .select('content_hash')
        .where({
          frontier_entry_id: result.frontierEntryId,
          status: 'succeeded',
        })
        .whereNot('attempt_id', result.attemptId)
        .orderBy('recorded_at', 'desc')
        .orderBy('attempt_id', 'desc')
        .first();

      await transaction('url_frontier_entries')
        .where({
          id: result.frontierEntryId,
          active_attempt_id: result.attemptId,
        })
        .update(
          toFrontierCompletionRowUpdate(
            toFrontierCompletionUpdate(
              result,
              row.recorded_at,
              frontierEntry.consecutive_failures,
              frontierEntry.crawl_policy,
              retryPolicyFromCrawlPolicy(frontierEntry.crawl_policy),
              previousSuccessfulAttempt?.content_hash ?? null,
            ),
            transaction,
          ),
        );
    });
  }
}

export function toCrawlAttemptRow(
  result: UrlFrontierCrawlResult,
  recordedAt: Date,
): CrawlAttemptRow {
  return {
    attempt_id: result.attemptId,
    frontier_entry_id: result.frontierEntryId,
    topic_id: result.topicId,
    topic_configuration_version: result.topicConfigurationVersion,
    requested_url: result.requestedUrl,
    status: result.status,
    final_url: result.finalUrl ?? null,
    status_code: result.statusCode ?? null,
    headers: serializeJson(result.headers),
    redirect_chain: serializeJson(result.redirectChain ?? []),
    canonical_url: result.canonicalUrl ?? null,
    title: result.title ?? null,
    meta_description: result.metaDescription ?? null,
    raw_html: result.rawHtml ?? null,
    cleaned_markdown: result.cleanedMarkdown ?? null,
    plain_text: result.plainText ?? null,
    content_hash: result.contentHash,
    outgoing_links: serializeJson(result.outgoingLinks ?? []),
    media_assets: serializeJson(result.mediaAssets ?? []),
    timing: serializeJson(result.timing),
    adapter_key: result.adapter.key,
    adapter_version: result.adapter.version,
    failure: result.failure ? serializeJson(result.failure) : null,
    recorded_at: recordedAt,
    updated_at: recordedAt,
  };
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value);
}

export function toFrontierCompletionUpdate(
  result: UrlFrontierCrawlResult,
  completedAt: Date,
  currentConsecutiveFailures = 0,
  crawlPolicy: Partial<UrlFrontierSuccessRecrawlPolicy> =
    DEFAULT_URL_FRONTIER_SUCCESS_RECRAWL_POLICY,
  retryPolicy = DEFAULT_URL_FRONTIER_RETRY_POLICY,
  previousSuccessfulContentHash: string | null = null,
): UrlFrontierCompletionUpdate {
  const base = {
    active_attempt_id: null,
    lease_owner: null,
    lease_expires_at: null,
    incrementConsecutiveFailures: false,
    updated_at: completedAt,
  } as const;

  if (result.status === 'succeeded') {
    return {
      ...base,
      crawl_status: 'succeeded',
      last_crawled_at: completedAt,
      next_crawl_at: addMilliseconds(
        completedAt,
        successRecrawlDelayMs(
          crawlPolicy,
          contentChangeSignal(result.contentHash, previousSuccessfulContentHash),
        ),
      ),
      freshness_score: 0,
      recrawl_reason: 'success_recrawl',
      consecutive_failures: 0,
    };
  }

  if (result.status === 'failed_retryable' || result.status === 'timed_out') {
    const nextConsecutiveFailures = currentConsecutiveFailures + 1;

    if (nextConsecutiveFailures >= retryPolicy.maxRetryableFailures) {
      return {
        ...base,
        crawl_status: 'failed_terminal',
        consecutive_failures: nextConsecutiveFailures,
      };
    }

    return {
      ...base,
      crawl_status: 'failed_retryable',
      next_crawl_at: addMilliseconds(
        completedAt,
        retryDelayMs(currentConsecutiveFailures, retryPolicy),
      ),
      freshness_score: 0,
      recrawl_reason: 'retry_backoff',
      incrementConsecutiveFailures: true,
    };
  }

  return {
    ...base,
    crawl_status: 'failed_terminal',
  };
}

function toFrontierCompletionRowUpdate(
  update: UrlFrontierCompletionUpdate,
  transaction: { raw(sql: string): unknown },
): Record<string, unknown> {
  const { incrementConsecutiveFailures, ...rowUpdate } = update;

  if (!incrementConsecutiveFailures) {
    return rowUpdate;
  }

  return {
    ...rowUpdate,
    consecutive_failures: transaction.raw('consecutive_failures + 1'),
  };
}

export function retryDelayMs(
  currentConsecutiveFailures: number,
  retryPolicy: UrlFrontierRetryPolicy = DEFAULT_URL_FRONTIER_RETRY_POLICY,
  jitterSeed = String(currentConsecutiveFailures),
): number {
  const exponent = Math.max(0, currentConsecutiveFailures);
  const exponentialDelay = Math.min(
    retryPolicy.maxBackoffMs,
    retryPolicy.baseBackoffMs * 2 ** exponent,
  );
  const jitterWindow = Math.round(exponentialDelay * retryPolicy.jitterRatio);
  const jitter = jitterWindow === 0
    ? 0
    : Math.round(stableJitterRatio(jitterSeed) * jitterWindow);
  return Math.min(retryPolicy.maxBackoffMs, exponentialDelay + jitter);
}

export function retryPolicyFromCrawlPolicy(
  crawlPolicy: UrlFrontierCrawlPolicySnapshot,
): UrlFrontierRetryPolicy {
  return {
    baseBackoffMs: positiveOrDefault(
      crawlPolicy.retryBaseBackoffMs,
      DEFAULT_URL_FRONTIER_RETRY_POLICY.baseBackoffMs,
    ),
    maxBackoffMs: positiveOrDefault(
      crawlPolicy.retryMaxBackoffMs,
      DEFAULT_URL_FRONTIER_RETRY_POLICY.maxBackoffMs,
    ),
    maxRetryableFailures: positiveOrDefault(
      crawlPolicy.retryMaxFailures,
      DEFAULT_URL_FRONTIER_RETRY_POLICY.maxRetryableFailures,
    ),
    jitterRatio: boundedRatio(
      crawlPolicy.retryJitterRatio,
      DEFAULT_URL_FRONTIER_RETRY_POLICY.jitterRatio,
    ),
  };
}

export function successRecrawlDelayMs(
  crawlPolicy: Partial<UrlFrontierSuccessRecrawlPolicy> =
    DEFAULT_URL_FRONTIER_SUCCESS_RECRAWL_POLICY,
  contentChange: UrlFrontierContentChangeSignal = 'unknown',
): number {
  const policy = {
    ...DEFAULT_URL_FRONTIER_SUCCESS_RECRAWL_POLICY,
    ...crawlPolicy,
  };
  const adjustedIntervalHours =
    policy.recrawlIntervalHours *
    URL_FRONTIER_ADAPTIVE_RECRAWL_MULTIPLIERS[contentChange];
  const boundedHours = Math.min(
    policy.maxRecrawlIntervalHours,
    Math.max(policy.minRecrawlIntervalHours, adjustedIntervalHours),
  );
  return boundedHours * 60 * 60 * 1000;
}

export function contentChangeSignal(
  currentContentHash: string | null,
  previousSuccessfulContentHash: string | null,
): UrlFrontierContentChangeSignal {
  if (!currentContentHash || !previousSuccessfulContentHash) {
    return 'unknown';
  }

  return currentContentHash === previousSuccessfulContentHash
    ? 'unchanged'
    : 'changed';
}

function addMilliseconds(date: Date, milliseconds: number): Date {
  return new Date(date.getTime() + milliseconds);
}

function positiveOrDefault(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value && value > 0
    ? Math.round(value)
    : fallback;
}

function boundedRatio(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(0.5, value ?? fallback));
}

function stableJitterRatio(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash / 0xffffffff;
}
