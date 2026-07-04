import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { CRAWL_QUEUE_NAME } from '@seo-kb/common';
import { Queue } from 'bullmq';
import {
  UrlFrontierLease,
  UrlFrontierLeaseOptions,
  UrlFrontierRepository,
} from '../domain/url-frontier-types';
import { URL_FRONTIER_REPOSITORY } from '../url-frontier.tokens';

export interface UrlFrontierDispatchOptions extends UrlFrontierLeaseOptions {
  removeOnComplete?: number;
  removeOnFail?: number;
}

export interface UrlFrontierDispatchResult {
  leased: boolean;
  lease: UrlFrontierLease | null;
  jobId: string | null;
}

export interface UrlFrontierDispatchBatchOptions
  extends UrlFrontierDispatchOptions {
  maxDispatches: number;
}

export interface UrlFrontierDispatchBatchResult {
  requested: number;
  dispatched: number;
  jobIds: string[];
  exhausted: boolean;
}

@Injectable()
export class UrlFrontierDispatchService {
  constructor(
    @InjectQueue(CRAWL_QUEUE_NAME)
    private readonly crawlQueue: Queue,
    @Inject(URL_FRONTIER_REPOSITORY)
    private readonly urlFrontierRepository: UrlFrontierRepository,
  ) {}

  async dispatchNext(
    options: UrlFrontierDispatchOptions,
  ): Promise<UrlFrontierDispatchResult> {
    const lease = await this.urlFrontierRepository.leaseNext(options);
    if (!lease) {
      return {
        leased: false,
        lease: null,
        jobId: null,
      };
    }

    await this.crawlQueue.add(CRAWL_QUEUE_NAME, lease.command, {
      jobId: lease.attemptId,
      removeOnComplete: options.removeOnComplete ?? 1000,
      removeOnFail: options.removeOnFail ?? 5000,
    });

    return {
      leased: true,
      lease,
      jobId: lease.attemptId,
    };
  }

  async dispatchBatch(
    options: UrlFrontierDispatchBatchOptions,
  ): Promise<UrlFrontierDispatchBatchResult> {
    assertPositiveInteger(options.maxDispatches, 'maxDispatches');

    const jobIds: string[] = [];
    for (let index = 0; index < options.maxDispatches; index += 1) {
      const result = await this.dispatchNext(options);
      if (!result.leased || !result.jobId) {
        return {
          requested: options.maxDispatches,
          dispatched: jobIds.length,
          jobIds,
          exhausted: true,
        };
      }
      jobIds.push(result.jobId);
    }

    return {
      requested: options.maxDispatches,
      dispatched: jobIds.length,
      jobIds,
      exhausted: false,
    };
  }
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${field} must be a positive integer`);
  }
}
