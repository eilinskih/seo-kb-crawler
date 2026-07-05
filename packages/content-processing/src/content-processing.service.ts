import { Inject, Injectable } from '@nestjs/common';
import {
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
    const attempt = await this.repository.findSuccessfulCrawlAttempt(
      command.crawlAttemptId,
    );
    if (!attempt) {
      throw new Error('successful crawl attempt was not found');
    }
    return this.processCrawlAttempt(attempt, command);
  }
}

function hasUsableBody(attempt: CrawlAttemptForProcessing): boolean {
  return Boolean(attempt.rawHtml ?? attempt.cleanedMarkdown ?? attempt.plainText);
}
