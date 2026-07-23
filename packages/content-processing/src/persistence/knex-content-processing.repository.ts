import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  ContentProcessingFailureCommand,
  ContentProcessingFailure,
  ContentProcessingRecord,
  ContentProcessingRepository,
  ContentProcessingRunCommand,
  ContentInspectionSummary,
  ContentProcessingStatusSummary,
  ContentProcessingStatus,
  CrawlAttemptForProcessing,
  DocumentMetadata,
  ProcessCrawlAttemptResult,
} from '../domain/content-processing-types';
import { reusableContentVersion } from '../domain/document-versioning';
import { extractContentSignals } from '../content-extraction';

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

interface CrawlAttemptRow {
  attempt_id: string;
  frontier_entry_id: string;
  topic_id: string;
  topic_configuration_version: number;
  requested_url: string;
  status: string;
  final_url: string | null;
  headers: Record<string, string>;
  canonical_url: string | null;
  title: string | null;
  meta_description: string | null;
  raw_html: string | null;
  cleaned_markdown: string | null;
  plain_text: string | null;
  content_hash: string | null;
  recorded_at: Date | string;
}

@Injectable()
export class KnexContentProcessingRepository
  implements ContentProcessingRepository {
  constructor(private readonly db: DbService) {}

  async findSuccessfulCrawlAttempt(
    crawlAttemptId: string,
  ): Promise<CrawlAttemptForProcessing | null> {
    const row = await this.db.knex<CrawlAttemptRow>('crawl_attempts')
      .where({
        attempt_id: crawlAttemptId,
        status: 'succeeded',
      })
      .first();

    return row ? toCrawlAttemptForProcessing(row) : null;
  }

  async findPendingSuccessfulCrawlAttempts(options: {
    limit: number;
  }): Promise<CrawlAttemptForProcessing[]> {
    const rows = await this.db.knex<CrawlAttemptRow>('crawl_attempts')
      .leftJoin<ContentProcessingRunRow>(
        'content_processing_runs',
        'crawl_attempts.attempt_id',
        'content_processing_runs.crawl_attempt_id',
      )
      .where('crawl_attempts.status', 'succeeded')
      .where((builder) =>
        builder
          .whereNull('content_processing_runs.crawl_attempt_id')
          .orWhere('content_processing_runs.status', 'pending')
          .orWhere('content_processing_runs.status', 'failed_retryable'),
      )
      .select('crawl_attempts.*')
      .orderBy('crawl_attempts.recorded_at', 'asc')
      .limit(options.limit);

    return rows.map(toCrawlAttemptForProcessing);
  }

  async markProcessingPending(
    command: ContentProcessingRunCommand,
  ): Promise<void> {
    await upsertProcessingRun(this.db.knex, {
      crawl_attempt_id: command.crawlAttemptId,
      document_id: null,
      document_version_id: null,
      status: 'pending',
      failure: null,
      extractor_version: command.extractorVersion,
      started_at: null,
      completed_at: null,
      created_at: command.now,
      updated_at: command.now,
    });
  }

  async markProcessingStarted(
    command: ContentProcessingRunCommand,
  ): Promise<void> {
    await upsertProcessingRun(this.db.knex, {
      crawl_attempt_id: command.crawlAttemptId,
      document_id: null,
      document_version_id: null,
      status: 'processing',
      failure: null,
      extractor_version: command.extractorVersion,
      started_at: command.now,
      completed_at: null,
      created_at: command.now,
      updated_at: command.now,
    });
  }

  async markProcessingFailed(
    command: ContentProcessingFailureCommand,
  ): Promise<void> {
    await upsertProcessingRun(this.db.knex, {
      crawl_attempt_id: command.crawlAttemptId,
      document_id: null,
      document_version_id: null,
      status: command.failure.retryable
        ? 'failed_retryable'
        : 'failed_terminal',
      failure: command.failure,
      extractor_version: command.extractorVersion,
      started_at: command.now,
      completed_at: command.now,
      created_at: command.now,
      updated_at: command.now,
    });
  }

  async findProcessingRecord(
    crawlAttemptId: string,
  ): Promise<ContentProcessingRecord | null> {
    const row = await this.db
      .knex<ContentProcessingRunRow>('content_processing_runs')
      .where({ crawl_attempt_id: crawlAttemptId })
      .first();

    return row ? toProcessingRecord(row) : null;
  }

  async summarizeStatus(): Promise<ContentProcessingStatusSummary> {
    const countRows = await this.db.knex<ContentProcessingRunRow>(
      'content_processing_runs',
    )
      .select('status')
      .count({ count: '*' })
      .groupBy('status') as Array<{
        status: ContentProcessingStatus;
        count: string | number;
      }>;
    const recentFailureRows = await this.db.knex<ContentProcessingRunRow>(
      'content_processing_runs',
    )
      .whereIn('status', ['failed_retryable', 'failed_terminal'])
      .orderBy('updated_at', 'desc')
      .limit(10);
    const counts = countRows.map((row) => ({
      status: row.status,
      count: Number(row.count),
    }));

    return {
      totalRuns: counts.reduce((total, row) => total + row.count, 0),
      counts,
      retryableFailures: countContentProcessingStatus(counts, 'failed_retryable'),
      terminalFailures: countContentProcessingStatus(counts, 'failed_terminal'),
      recentFailures: recentFailureRows
        .filter((row) => row.failure)
        .map((row) => ({
          crawlAttemptId: row.crawl_attempt_id,
          status: row.status,
          category: row.failure!.category,
          detail: row.failure!.detail,
          retryable: row.failure!.retryable,
          updatedAt: toIsoString(row.updated_at),
        })),
    };
  }

  async summarizeInspection(): Promise<ContentInspectionSummary> {
    const rows = await this.db.knex<DocumentVersionRow>('document_versions')
      .orderBy('created_at', 'desc')
      .limit(10);

    return {
      recentDocuments: rows.map((row) => ({
        documentId: row.document_id,
        documentVersionId: row.id,
        topicId: row.topic_id,
        requestedUrl: row.requested_url,
        finalUrl: row.final_url,
        title: row.title,
        wordCount: row.metadata.wordCount,
        createdAt: toIsoString(row.created_at),
      })),
    };
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

      const existingContentVersion = attempt.contentHash
        ? await transaction<DocumentVersionRow>('document_versions')
          .where({
            document_id: document.id,
            content_hash: attempt.contentHash,
            extractor_version: options.extractorVersion,
          })
          .first()
        : null;

      const reusableVersion = existingContentVersion
        ? reusableContentVersion(
          [
            {
              id: existingContentVersion.id,
              contentHash: existingContentVersion.content_hash,
              extractorVersion: existingContentVersion.extractor_version,
            },
          ],
          {
            contentHash: attempt.contentHash,
            extractorVersion: options.extractorVersion,
          },
        )
        : null;

      if (existingContentVersion && reusableVersion) {
        await transaction<DocumentRow>('documents')
          .where({ id: document.id })
          .update({
            current_version_id: reusableVersion.id,
            updated_at: options.now,
          });
        await upsertProcessingRun(transaction, {
          crawl_attempt_id: attempt.attemptId,
          document_id: document.id,
          document_version_id: reusableVersion.id,
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
          documentVersionId: reusableVersion.id,
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

      const persistedVersion = await transaction<DocumentVersionRow>(
        'document_versions',
      )
        .where({
          crawl_attempt_id: attempt.attemptId,
          extractor_version: options.extractorVersion,
        })
        .first();
      if (!persistedVersion) {
        throw new Error('document version could not be created');
      }

      await transaction<DocumentRow>('documents')
        .where({ id: document.id })
        .update({
          current_version_id: persistedVersion.id,
          updated_at: options.now,
        });

      await upsertProcessingRun(transaction, {
        crawl_attempt_id: attempt.attemptId,
        document_id: document.id,
        document_version_id: persistedVersion.id,
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
        documentVersionId: persistedVersion.id,
      };
    });
  }
}

function toCrawlAttemptForProcessing(
  row: CrawlAttemptRow,
): CrawlAttemptForProcessing {
  return {
    attemptId: row.attempt_id,
    frontierEntryId: row.frontier_entry_id,
    topicId: row.topic_id,
    topicConfigurationVersion: row.topic_configuration_version,
    requestedUrl: row.requested_url,
    status: 'succeeded',
    finalUrl: row.final_url,
    canonicalUrl: row.canonical_url,
    title: row.title,
    metaDescription: row.meta_description,
    rawHtml: row.raw_html,
    cleanedMarkdown: row.cleaned_markdown,
    plainText: row.plain_text,
    contentHash: row.content_hash,
    headers: row.headers,
    recordedAt: new Date(row.recorded_at),
  };
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
  const extracted = extractContentSignals({
    rawHtml: attempt.rawHtml,
    cleanedMarkdown: attempt.cleanedMarkdown,
    plainText: attempt.plainText,
    requestedUrl: attempt.requestedUrl,
    finalUrl: attempt.finalUrl,
    canonicalUrl: attempt.canonicalUrl,
    headers: attempt.headers,
  });

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
    metadata: extracted.metadata,
    structured_data: extracted.structuredData,
    language_hints: extracted.languageHints,
    geo_hints: extracted.geoHints,
    created_at: options.now,
  };
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

function countContentProcessingStatus(
  counts: Array<{ status: ContentProcessingStatus; count: number }>,
  status: ContentProcessingStatus,
): number {
  return counts.find((row) => row.status === status)?.count ?? 0;
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

interface TransactionLike {
  <TRecord extends object = Record<string, unknown>>(
    tableName: string,
  ): import('knex').Knex.QueryBuilder<TRecord, unknown[]>;
}
