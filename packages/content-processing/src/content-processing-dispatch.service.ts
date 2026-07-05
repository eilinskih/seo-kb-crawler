import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { CONTENT_PROCESSING_QUEUE_NAME } from '@seo-kb/common';
import { Queue } from 'bullmq';
import {
  ContentProcessingJobPayload,
  ContentProcessingRepository,
} from './domain/content-processing-types';
import { DEFAULT_CONTENT_EXTRACTOR_VERSION } from './content-processing.service';
import { CONTENT_PROCESSING_REPOSITORY } from './content-processing.tokens';

export interface ContentProcessingDispatchOptions {
  maxDispatches: number;
  extractorVersion?: string;
  removeOnComplete?: number;
  removeOnFail?: number;
}

export interface ContentProcessingDispatchResult {
  requested: number;
  dispatched: number;
  jobIds: string[];
  exhausted: boolean;
}

@Injectable()
export class ContentProcessingDispatchService {
  constructor(
    @InjectQueue(CONTENT_PROCESSING_QUEUE_NAME)
    private readonly contentProcessingQueue: Queue,
    @Inject(CONTENT_PROCESSING_REPOSITORY)
    private readonly repository: ContentProcessingRepository,
  ) {}

  async dispatchPendingSuccessfulAttempts(
    options: ContentProcessingDispatchOptions,
  ): Promise<ContentProcessingDispatchResult> {
    assertPositiveInteger(options.maxDispatches, 'maxDispatches');

    const attempts = await this.repository.findPendingSuccessfulCrawlAttempts({
      limit: options.maxDispatches,
    });
    const jobIds: string[] = [];
    const extractorVersion =
      options.extractorVersion ?? DEFAULT_CONTENT_EXTRACTOR_VERSION;

    for (const attempt of attempts) {
      const payload: ContentProcessingJobPayload = {
        crawlAttemptId: attempt.attemptId,
        extractorVersion,
      };
      await this.repository.markProcessingPending({
        crawlAttemptId: attempt.attemptId,
        extractorVersion,
        now: new Date(),
      });
      await this.contentProcessingQueue.add(
        CONTENT_PROCESSING_QUEUE_NAME,
        payload,
        {
          jobId: attempt.attemptId,
          removeOnComplete: options.removeOnComplete ?? 1000,
          removeOnFail: options.removeOnFail ?? 5000,
        },
      );
      jobIds.push(attempt.attemptId);
    }

    return {
      requested: options.maxDispatches,
      dispatched: jobIds.length,
      jobIds,
      exhausted: jobIds.length < options.maxDispatches,
    };
  }
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${field} must be a positive integer`);
  }
}
