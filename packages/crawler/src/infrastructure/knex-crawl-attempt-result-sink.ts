import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  CrawlAttemptStatus,
  CrawlFailure,
  CrawlResultSink,
  CrawlerAdapterKey,
  ExtractedCrawlLink,
  MediaAssetMetadata,
  NormalizedCrawlResult,
  RedirectEvidence,
} from '../domain/crawler-types';

export interface CrawlAttemptRow {
  attempt_id: string;
  frontier_entry_id: string;
  topic_id: string;
  topic_configuration_version: number;
  requested_url: string;
  status: CrawlAttemptStatus;
  final_url: string | null;
  status_code: number | null;
  headers: Record<string, string>;
  redirect_chain: RedirectEvidence[];
  canonical_url: string | null;
  title: string | null;
  meta_description: string | null;
  raw_html: string | null;
  cleaned_markdown: string | null;
  plain_text: string | null;
  content_hash: string | null;
  outgoing_links: ExtractedCrawlLink[];
  media_assets: MediaAssetMetadata[];
  timing: NormalizedCrawlResult['timing'];
  adapter_key: CrawlerAdapterKey;
  adapter_version: string;
  failure: CrawlFailure | null;
  recorded_at: Date;
  updated_at: Date;
}

@Injectable()
export class KnexCrawlAttemptResultSink implements CrawlResultSink {
  constructor(private readonly db: DbService) {}

  async append(result: NormalizedCrawlResult): Promise<void> {
    const row = toCrawlAttemptRow(result, new Date());
    const { recorded_at: _recordedAt, ...retryUpdate } = row;
    await this.db
      .knex<CrawlAttemptRow>('crawl_attempts')
      .insert(row)
      .onConflict('attempt_id')
      .merge(retryUpdate);
  }
}

export function toCrawlAttemptRow(
  result: NormalizedCrawlResult,
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
