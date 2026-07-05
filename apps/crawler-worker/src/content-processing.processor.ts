import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { CONTENT_PROCESSING_QUEUE_NAME } from '@seo-kb/common';
import {
  ContentProcessingJobPayload,
  ContentProcessingService,
} from '@seo-kb/content-processing';
import { Job } from 'bullmq';

@Processor(CONTENT_PROCESSING_QUEUE_NAME)
export class ContentProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(ContentProcessingProcessor.name);

  constructor(
    private readonly contentProcessingService: ContentProcessingService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const payload = job.data as ContentProcessingJobPayload;
    const result = await this.contentProcessingService.processQueuedCrawlAttempt({
      crawlAttemptId: payload.crawlAttemptId,
      extractorVersion: payload.extractorVersion,
      now: new Date(),
    });
    this.logger.log(
      `Processed content job ${job.id ?? payload.crawlAttemptId} with status ${result.status}`,
    );
  }
}
