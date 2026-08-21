import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EXTERNAL_ENTITY_ENRICHMENT_QUEUE_NAME } from '@seo-kb/common';
import {
  DemandEntityEnrichmentJob,
  DemandEntityEnrichmentWorkerService,
} from '@seo-kb/demand-engine';
import { Job } from 'bullmq';

@Processor(EXTERNAL_ENTITY_ENRICHMENT_QUEUE_NAME)
export class ExternalEntityEnrichmentProcessor extends WorkerHost {
  private readonly logger = new Logger(ExternalEntityEnrichmentProcessor.name);

  constructor(
    private readonly entityEnrichmentWorker: DemandEntityEnrichmentWorkerService,
  ) {
    super();
  }

  async process(job: Job<DemandEntityEnrichmentJob>): Promise<void> {
    const result = await this.entityEnrichmentWorker.process(job.data);
    this.logger.log(
      `Processed external entity enrichment job ${job.id} with status ${result.status}`,
    );
  }
}
