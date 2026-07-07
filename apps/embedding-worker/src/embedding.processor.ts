import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EMBEDDING_QUEUE_NAME } from '@seo-kb/common';
import { EmbeddingJob, EmbeddingService } from '@seo-kb/embeddings';
import { Job } from 'bullmq';

@Processor(EMBEDDING_QUEUE_NAME)
export class EmbeddingProcessor extends WorkerHost {
  private readonly logger = new Logger(EmbeddingProcessor.name);

  constructor(private readonly embeddingService: EmbeddingService) {
    super();
  }

  async process(job: Job<EmbeddingJob>): Promise<void> {
    const result = await this.embeddingService.embedBatch({
      chunkIds: job.data.chunkIds,
      now: new Date(),
    });

    this.logger.log(
      `Processed embedding job ${job.id} with status ${result.status}`,
    );
  }
}
