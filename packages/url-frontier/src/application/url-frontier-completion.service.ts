import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import { UrlFrontierCrawlPolicySnapshot } from '../domain/url-frontier-types';

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
  headers: Record<string, string>;
  redirect_chain: unknown[];
  canonical_url: string | null;
  title: string | null;
  meta_description: string | null;
  raw_html: string | null;
  cleaned_markdown: string | null;
  plain_text: string | null;
  content_hash: string | null;
  outgoing_links: unknown[];
  media_assets: unknown[];
  timing: unknown;
  adapter_key: string;
  adapter_version: string;
  failure: UrlFrontierCrawlFailure | null;
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
  consecutive_failures?: number;
  incrementConsecutiveFailures: boolean;
  updated_at: Date;
}

export interface UrlFrontierRetryPolicy {
  baseBackoffMs: number;
  maxBackoffMs: number;
  maxRetryableFailures: number;
}

export const DEFAULT_URL_FRONTIER_RETRY_POLICY: UrlFrontierRetryPolicy = {
  baseBackoffMs: 5 * 60 * 1000,
  maxBackoffMs: 6 * 60 * 60 * 1000,
  maxRetryableFailures: 5,
};

export interface UrlFrontierSuccessRecrawlPolicy {
  recrawlIntervalHours: number;
  minRecrawlIntervalHours: number;
  maxRecrawlIntervalHours: number;
}

export const DEFAULT_URL_FRONTIER_SUCCESS_RECRAWL_POLICY:
  UrlFrontierSuccessRecrawlPolicy = {
    recrawlIntervalHours: 168,
    minRecrawlIntervalHours: 24,
    maxRecrawlIntervalHours: 720,
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
    headers: result.headers,
    redirect_chain: result.redirectChain ?? [],
    canonical_url: result.canonicalUrl ?? null,
    title: result.title ?? null,
    meta_description: result.metaDescription ?? null,
    raw_html: result.rawHtml ?? null,
    cleaned_markdown: result.cleanedMarkdown ?? null,
    plain_text: result.plainText ?? null,
    content_hash: result.contentHash,
    outgoing_links: result.outgoingLinks ?? [],
    media_assets: result.mediaAssets ?? [],
    timing: result.timing,
    adapter_key: result.adapter.key,
    adapter_version: result.adapter.version,
    failure: result.failure,
    recorded_at: recordedAt,
    updated_at: recordedAt,
  };
}

export function toFrontierCompletionUpdate(
  result: UrlFrontierCrawlResult,
  completedAt: Date,
  currentConsecutiveFailures = 0,
  crawlPolicy: Partial<UrlFrontierSuccessRecrawlPolicy> =
    DEFAULT_URL_FRONTIER_SUCCESS_RECRAWL_POLICY,
  retryPolicy = DEFAULT_URL_FRONTIER_RETRY_POLICY,
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
        successRecrawlDelayMs(crawlPolicy),
      ),
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
): number {
  const exponent = Math.max(0, currentConsecutiveFailures);
  return Math.min(
    retryPolicy.maxBackoffMs,
    retryPolicy.baseBackoffMs * 2 ** exponent,
  );
}

export function successRecrawlDelayMs(
  crawlPolicy: Partial<UrlFrontierSuccessRecrawlPolicy> =
    DEFAULT_URL_FRONTIER_SUCCESS_RECRAWL_POLICY,
): number {
  const policy = {
    ...DEFAULT_URL_FRONTIER_SUCCESS_RECRAWL_POLICY,
    ...crawlPolicy,
  };
  const boundedHours = Math.min(
    policy.maxRecrawlIntervalHours,
    Math.max(policy.minRecrawlIntervalHours, policy.recrawlIntervalHours),
  );
  return boundedHours * 60 * 60 * 1000;
}

function addMilliseconds(date: Date, milliseconds: number): Date {
  return new Date(date.getTime() + milliseconds);
}
