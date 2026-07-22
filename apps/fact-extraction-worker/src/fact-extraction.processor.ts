import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { FACT_EXTRACTION_QUEUE_NAME } from '@seo-kb/common';
import {
  FactExtractionJob,
  FactExtractionService,
} from '@seo-kb/fact-extraction';
import { Job } from 'bullmq';

@Processor(FACT_EXTRACTION_QUEUE_NAME)
export class FactExtractionProcessor extends WorkerHost {
  private readonly logger = new Logger(FactExtractionProcessor.name);

  constructor(private readonly factExtractionService: FactExtractionService) {
    super();
  }

  async process(job: Job<FactExtractionJob>): Promise<void> {
    const results = await this.factExtractionService.extractBatch({
      chunkIds: job.data.chunkIds,
      now: new Date(job.data.requestedAt),
    });

    this.logger.log(
      `Processed fact extraction job ${job.id} for ${results.length} chunks`,
    );
  }
}
