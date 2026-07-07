import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { EMBEDDING_QUEUE_NAME } from '@seo-kb/common';
import { Queue } from 'bullmq';
import { EmbeddingJob } from './domain/embedding-types';
import { EmbeddingProvider } from './domain/embedding-provider';
import { EMBEDDING_PROVIDER } from './embedding.tokens';
import { EmbeddingService } from './embedding.service';

export interface DispatchEmbeddingOptions {
  limit: number;
  batchSize: number;
  minTokenCount?: number;
  now: Date;
}

export interface DispatchEmbeddingResult {
  candidateCount: number;
  enqueuedJobCount: number;
}

@Injectable()
export class EmbeddingDispatchService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    @Inject(EMBEDDING_PROVIDER)
    private readonly provider: EmbeddingProvider,
    @InjectQueue(EMBEDDING_QUEUE_NAME)
    private readonly embeddingQueue: Queue<EmbeddingJob>,
  ) {}

  async dispatchMissingEmbeddings(
    options: DispatchEmbeddingOptions,
  ): Promise<DispatchEmbeddingResult> {
    const candidates = await this.embeddingService.findCandidates({
      limit: options.limit,
      minTokenCount: options.minTokenCount,
    });
    const batches = chunk(candidates.map((candidate) => candidate.id), Math.max(
      1,
      options.batchSize,
    ));

    for (const [index, chunkIds] of batches.entries()) {
      const job: EmbeddingJob = {
        jobId: [
          'embedding',
          this.provider.identity.providerKey,
          this.provider.identity.modelKey,
          this.provider.identity.modelVersion,
          options.now.getTime(),
          index,
        ].join(':'),
        chunkIds,
        providerKey: this.provider.identity.providerKey,
        modelKey: this.provider.identity.modelKey,
        modelVersion: this.provider.identity.modelVersion,
        dimensions: this.provider.identity.dimensions,
        requestedAt: options.now.toISOString(),
      };

      await this.embeddingQueue.add(EMBEDDING_QUEUE_NAME, job, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 30_000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      });
    }

    return {
      candidateCount: candidates.length,
      enqueuedJobCount: batches.length,
    };
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}
