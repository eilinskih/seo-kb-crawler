import { Inject, Injectable } from '@nestjs/common';
import {
  ContentProcessingFailure,
  ContentProcessingRecord,
  ContentProcessingRepository,
  CrawlAttemptForProcessing,
  ProcessCrawlAttemptCommand,
  ProcessCrawlAttemptResult,
} from './domain/content-processing-types';
import { CONTENT_PROCESSING_REPOSITORY } from './content-processing.tokens';

export const DEFAULT_CONTENT_EXTRACTOR_VERSION = 'content-processor/0.1.0';

@Injectable()
export class ContentProcessingService {
  constructor(
    @Inject(CONTENT_PROCESSING_REPOSITORY)
    private readonly repository: ContentProcessingRepository,
  ) {}

  async processCrawlAttempt(
    attempt: CrawlAttemptForProcessing,
    command: ProcessCrawlAttemptCommand,
  ): Promise<ProcessCrawlAttemptResult> {
    if (attempt.attemptId !== command.crawlAttemptId) {
      throw new Error('crawlAttemptId must match the supplied crawl attempt');
    }
    if (attempt.status !== 'succeeded') {
      throw new Error('only successful crawl attempts can be processed');
    }
    if (!hasUsableBody(attempt)) {
      throw new Error('successful crawl attempt has no usable body');
    }

    return this.repository.processSuccessfulCrawlAttempt(attempt, {
      now: command.now,
      extractorVersion:
        command.extractorVersion ?? DEFAULT_CONTENT_EXTRACTOR_VERSION,
    });
  }

  async processCrawlAttemptById(
    command: ProcessCrawlAttemptCommand,
  ): Promise<ProcessCrawlAttemptResult> {
    return this.processTrackedCrawlAttempt(command);
  }

  async markCrawlAttemptProcessingPending(
    command: ProcessCrawlAttemptCommand,
  ): Promise<void> {
    await this.repository.markProcessingPending({
      crawlAttemptId: command.crawlAttemptId,
      extractorVersion:
        command.extractorVersion ?? DEFAULT_CONTENT_EXTRACTOR_VERSION,
      now: command.now,
    });
  }

  async processQueuedCrawlAttempt(
    command: ProcessCrawlAttemptCommand,
  ): Promise<ProcessCrawlAttemptResult> {
    return this.processTrackedCrawlAttempt(command);
  }

  async processManualCrawlAttempt(
    command: ProcessCrawlAttemptCommand,
  ): Promise<ProcessCrawlAttemptResult> {
    return this.processTrackedCrawlAttempt(command);
  }

  private async processTrackedCrawlAttempt(
    command: ProcessCrawlAttemptCommand,
  ): Promise<ProcessCrawlAttemptResult> {
    const extractorVersion =
      command.extractorVersion ?? DEFAULT_CONTENT_EXTRACTOR_VERSION;
    const existingRecord = await this.repository.findProcessingRecord(
      command.crawlAttemptId,
    );
    const terminalResult = resultFromTerminalRecord(existingRecord);
    if (terminalResult) {
      return terminalResult;
    }

    const attempt = await this.repository.findSuccessfulCrawlAttempt(
      command.crawlAttemptId,
    );
    if (!attempt) {
      throw new Error('successful crawl attempt was not found');
    }

    await this.repository.markProcessingStarted({
      crawlAttemptId: command.crawlAttemptId,
      extractorVersion,
      now: command.now,
    });

    try {
      return await this.processCrawlAttempt(attempt, {
        ...command,
        extractorVersion,
      });
    } catch (error) {
      await this.repository.markProcessingFailed({
        crawlAttemptId: command.crawlAttemptId,
        extractorVersion,
        now: command.now,
        failure: failureFromError(error),
      });
      throw error;
    }
  }
}

function resultFromTerminalRecord(
  record: ContentProcessingRecord | null,
): ProcessCrawlAttemptResult | null {
  if (!record) {
    return null;
  }
  if (record.status === 'failed_terminal') {
    throw new Error('processing run failed terminally');
  }
  if (record.status !== 'processed' && record.status !== 'skipped_duplicate') {
    return null;
  }
  if (!record.documentId) {
    throw new Error('processing run is missing document_id');
  }
  return {
    status: 'already_processed',
    documentId: record.documentId,
    documentVersionId: record.documentVersionId,
  };
}

function hasUsableBody(attempt: CrawlAttemptForProcessing): boolean {
  return Boolean(attempt.rawHtml ?? attempt.cleanedMarkdown ?? attempt.plainText);
}

function failureFromError(error: unknown): ContentProcessingFailure {
  const detail = error instanceof Error ? error.message : 'unknown failure';
  if (detail === 'successful crawl attempt has no usable body') {
    return {
      category: 'missing_body',
      detail,
      retryable: false,
    };
  }
  if (detail === 'only successful crawl attempts can be processed') {
    return {
      category: 'unsupported_content_type',
      detail,
      retryable: false,
    };
  }

  return {
    category: 'internal_error',
    detail,
    retryable: true,
  };
}
