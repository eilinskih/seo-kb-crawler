import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { FACT_EXTRACTION_QUEUE_NAME } from '@seo-kb/common';
import { Queue } from 'bullmq';
import { FactExtractionProvider } from './domain/fact-extraction-provider';
import {
  DEFAULT_FACT_EXTRACTION_PROFILE,
} from './domain/fact-extraction-profiles';
import {
  FactExtractionJob,
  FactExtractionProfile,
} from './domain/fact-extraction-types';
import { FactExtractionService } from './fact-extraction.service';
import { FACT_EXTRACTION_PROVIDER } from './fact-extraction.tokens';

export interface DispatchFactExtractionOptions {
  limit: number;
  batchSize: number;
  profile?: FactExtractionProfile;
  now: Date;
}

export interface DispatchFactExtractionResult {
  candidateCount: number;
  enqueuedJobCount: number;
}

@Injectable()
export class FactExtractionDispatchService {
  constructor(
    private readonly factExtractionService: FactExtractionService,
    @Inject(FACT_EXTRACTION_PROVIDER)
    private readonly provider: FactExtractionProvider,
    @InjectQueue(FACT_EXTRACTION_QUEUE_NAME)
    private readonly factExtractionQueue: Queue<FactExtractionJob>,
  ) {}

  async dispatchMissingFactExtraction(
    options: DispatchFactExtractionOptions,
  ): Promise<DispatchFactExtractionResult> {
    const profile = options.profile ?? DEFAULT_FACT_EXTRACTION_PROFILE;
    const candidates = await this.factExtractionService.findCandidates({
      limit: options.limit,
      profile,
    });
    const batches = chunk(candidates.map((candidate) => candidate.id), Math.max(
      1,
      options.batchSize,
    ));

    for (const [index, chunkIds] of batches.entries()) {
      const job: FactExtractionJob = {
        jobId: [
          'fact-extraction',
          this.provider.identity.providerKey,
          this.provider.identity.modelKey,
          this.provider.identity.modelVersion,
          profile.key,
          profile.version,
          options.now.getTime(),
          index,
        ].join(':'),
        chunkIds,
        providerKey: this.provider.identity.providerKey,
        modelKey: this.provider.identity.modelKey,
        modelVersion: this.provider.identity.modelVersion,
        profileKey: profile.key,
        profileVersion: profile.version,
        requestedAt: options.now.toISOString(),
        reason: 'new_chunk',
      };

      await this.factExtractionQueue.add(FACT_EXTRACTION_QUEUE_NAME, job, {
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
