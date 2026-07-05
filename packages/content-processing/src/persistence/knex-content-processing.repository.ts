import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  ContentProcessingFailure,
  ContentProcessingRecord,
  ContentProcessingRepository,
  ContentProcessingStatus,
  CrawlAttemptForProcessing,
  DocumentMetadata,
  ProcessCrawlAttemptResult,
} from '../domain/content-processing-types';

export interface DocumentRow {
  id: string;
  topic_id: string;
  frontier_entry_id: string;
  current_version_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface DocumentVersionRow {
  id: string;
  document_id: string;
  crawl_attempt_id: string;
  topic_id: string;
  frontier_entry_id: string;
  topic_configuration_version: number;
  requested_url: string;
  final_url: string | null;
  canonical_url: string | null;
  title: string | null;
  meta_description: string | null;
  content_hash: string | null;
  extractor_version: string;
  raw_html: string | null;
  cleaned_markdown: string | null;
  plain_text: string | null;
  metadata: DocumentMetadata;
  structured_data: unknown[];
  language_hints: unknown[];
  geo_hints: unknown[];
  created_at: Date | string;
}

export interface ContentProcessingRunRow {
  crawl_attempt_id: string;
  document_id: string | null;
  document_version_id: string | null;
  status: ContentProcessingStatus;
  failure: ContentProcessingFailure | null;
  extractor_version: string;
  started_at: Date | string | null;
  completed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

@Injectable()
export class KnexContentProcessingRepository
  implements ContentProcessingRepository {
  constructor(private readonly db: DbService) {}

  async findProcessingRecord(
    crawlAttemptId: string,
  ): Promise<ContentProcessingRecord | null> {
    const row = await this.db
      .knex<ContentProcessingRunRow>('content_processing_runs')
      .where({ crawl_attempt_id: crawlAttemptId })
      .first();

    return row ? toProcessingRecord(row) : null;
  }

  async processSuccessfulCrawlAttempt(
    attempt: CrawlAttemptForProcessing,
    options: {
      now: Date;
      extractorVersion: string;
    },
  ): Promise<ProcessCrawlAttemptResult> {
    return this.db.knex.transaction(async (transaction) => {
      const existingRun = await transaction<ContentProcessingRunRow>(
        'content_processing_runs',
      )
        .where({ crawl_attempt_id: attempt.attemptId })
        .first();

      if (existingRun?.status === 'processed') {
        return {
          status: 'already_processed',
          documentId: requireDocumentId(existingRun),
          documentVersionId: existingRun.document_version_id,
        };
      }
      if (existingRun?.status === 'skipped_duplicate') {
        return {
          status: 'already_processed',
          documentId: requireDocumentId(existingRun),
          documentVersionId: existingRun.document_version_id,
        };
      }

      const document = await findOrCreateDocument(
        transaction,
        attempt,
        options.now,
      );
      const currentVersion = document.current_version_id
        ? await transaction<DocumentVersionRow>('document_versions')
          .where({ id: document.current_version_id })
          .first()
        : null;

      if (
        currentVersion &&
        currentVersion.content_hash &&
        attempt.contentHash &&
        currentVersion.content_hash === attempt.contentHash &&
        currentVersion.extractor_version === options.extractorVersion
      ) {
        await upsertProcessingRun(transaction, {
          crawl_attempt_id: attempt.attemptId,
          document_id: document.id,
          document_version_id: currentVersion.id,
          status: 'skipped_duplicate',
          failure: null,
          extractor_version: options.extractorVersion,
          started_at: options.now,
          completed_at: options.now,
          created_at: options.now,
          updated_at: options.now,
        });
        return {
          status: 'skipped_duplicate',
          documentId: document.id,
          documentVersionId: currentVersion.id,
        };
      }

      const version: DocumentVersionRow = toDocumentVersionRow(
        attempt,
        document.id,
        options,
      );
      await transaction<DocumentVersionRow>('document_versions')
        .insert(version)
        .onConflict(['crawl_attempt_id', 'extractor_version'])
        .ignore();

      await transaction<DocumentRow>('documents')
        .where({ id: document.id })
        .update({
          current_version_id: version.id,
          updated_at: options.now,
        });

      await upsertProcessingRun(transaction, {
        crawl_attempt_id: attempt.attemptId,
        document_id: document.id,
        document_version_id: version.id,
        status: 'processed',
        failure: null,
        extractor_version: options.extractorVersion,
        started_at: options.now,
        completed_at: options.now,
        created_at: options.now,
        updated_at: options.now,
      });

      return {
        status: 'processed',
        documentId: document.id,
        documentVersionId: version.id,
      };
    });
  }
}

function toProcessingRecord(
  row: ContentProcessingRunRow,
): ContentProcessingRecord {
  return {
    crawlAttemptId: row.crawl_attempt_id,
    documentId: row.document_id,
    documentVersionId: row.document_version_id,
    status: row.status,
    failure: row.failure,
    extractorVersion: row.extractor_version,
    startedAt: row.started_at ? new Date(row.started_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function findOrCreateDocument(
  transaction: TransactionLike,
  attempt: CrawlAttemptForProcessing,
  now: Date,
): Promise<DocumentRow> {
  const existing = await transaction<DocumentRow>('documents')
    .where({
      topic_id: attempt.topicId,
      frontier_entry_id: attempt.frontierEntryId,
    })
    .first();

  if (existing) {
    return existing;
  }

  const row: DocumentRow = {
    id: randomUUID(),
    topic_id: attempt.topicId,
    frontier_entry_id: attempt.frontierEntryId,
    current_version_id: null,
    created_at: now,
    updated_at: now,
  };
  await transaction<DocumentRow>('documents')
    .insert(row)
    .onConflict(['topic_id', 'frontier_entry_id'])
    .ignore();

  const created = await transaction<DocumentRow>('documents')
    .where({
      topic_id: attempt.topicId,
      frontier_entry_id: attempt.frontierEntryId,
    })
    .first();

  if (!created) {
    throw new Error('document could not be created');
  }
  return created;
}

function toDocumentVersionRow(
  attempt: CrawlAttemptForProcessing,
  documentId: string,
  options: {
    now: Date;
    extractorVersion: string;
  },
): DocumentVersionRow {
  return {
    id: randomUUID(),
    document_id: documentId,
    crawl_attempt_id: attempt.attemptId,
    topic_id: attempt.topicId,
    frontier_entry_id: attempt.frontierEntryId,
    topic_configuration_version: attempt.topicConfigurationVersion,
    requested_url: attempt.requestedUrl,
    final_url: attempt.finalUrl,
    canonical_url: attempt.canonicalUrl,
    title: attempt.title,
    meta_description: attempt.metaDescription,
    content_hash: attempt.contentHash,
    extractor_version: options.extractorVersion,
    raw_html: attempt.rawHtml,
    cleaned_markdown: attempt.cleanedMarkdown,
    plain_text: attempt.plainText,
    metadata: metadataFromAttempt(attempt),
    structured_data: [],
    language_hints: [],
    geo_hints: [],
    created_at: options.now,
  };
}

function metadataFromAttempt(
  attempt: CrawlAttemptForProcessing,
): DocumentMetadata {
  return {
    headings: [],
    openGraph: {},
    twitterCard: {},
    wordCount: wordCount(attempt.plainText ?? attempt.cleanedMarkdown),
    characterCount: (attempt.plainText ?? attempt.cleanedMarkdown ?? '').length,
    contentType: headerValue(attempt.headers, 'content-type'),
    cacheHeaders: selectedCacheHeaders(attempt.headers),
  };
}

function wordCount(text: string | null): number | null {
  if (!text) {
    return null;
  }
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function headerValue(
  headers: Record<string, string>,
  key: string,
): string | null {
  const lowerKey = key.toLowerCase();
  const match = Object.entries(headers).find(
    ([headerKey]) => headerKey.toLowerCase() === lowerKey,
  );
  return match?.[1] ?? null;
}

function selectedCacheHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const selected: Record<string, string> = {};
  for (const key of ['cache-control', 'expires', 'etag', 'last-modified']) {
    const value = headerValue(headers, key);
    if (value) {
      selected[key] = value;
    }
  }
  return selected;
}

async function upsertProcessingRun(
  transaction: TransactionLike,
  row: ContentProcessingRunRow,
): Promise<void> {
  const { created_at: _createdAt, ...retryUpdate } = row;
  await transaction<ContentProcessingRunRow>('content_processing_runs')
    .insert(row)
    .onConflict('crawl_attempt_id')
    .merge(retryUpdate);
}

function requireDocumentId(row: ContentProcessingRunRow): string {
  if (!row.document_id) {
    throw new Error('processing run is missing document_id');
  }
  return row.document_id;
}

interface TransactionLike {
  <TRecord extends object = Record<string, unknown>>(
    tableName: string,
  ): import('knex').Knex.QueryBuilder<TRecord, unknown[]>;
}
