import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { CRAWL_QUEUE_NAME } from '@seo-kb/common';
import { Job } from 'bullmq';

@Processor(CRAWL_QUEUE_NAME)
export class CrawlProcessor extends WorkerHost {
  private readonly logger = new Logger(CrawlProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.warn(
      `Received job ${job.id ?? 'unknown'} before crawler implementation is available`,
    );
  }
}
