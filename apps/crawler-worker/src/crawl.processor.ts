import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { CRAWL_QUEUE_NAME } from '@seo-kb/common';
import { CrawlJobHandler, CrawlCommandPayload } from '@seo-kb/crawler';
import { Job } from 'bullmq';

@Processor(CRAWL_QUEUE_NAME)
export class CrawlProcessor extends WorkerHost {
  private readonly logger = new Logger(CrawlProcessor.name);

  constructor(private readonly crawlJobHandler: CrawlJobHandler) {
    super();
  }

  async process(job: Job): Promise<void> {
    const result = await this.crawlJobHandler.handle(
      job.data as CrawlCommandPayload,
    );
    this.logger.log(
      `Processed crawl job ${job.id ?? result.attemptId} with status ${result.status}`,
    );
  }
}
