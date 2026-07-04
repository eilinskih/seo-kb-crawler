import { Queue } from 'bullmq';
import { UrlFrontierDispatchService } from './url-frontier-dispatch.service';
import {
  UrlFrontierLease,
  UrlFrontierRepository,
} from '../domain/url-frontier-types';

describe('UrlFrontierDispatchService', () => {
  it('leases the next entry and dispatches the crawl command with attempt job id', async () => {
    const lease = frontierLease();
    const crawlQueue = {
      add: jest.fn(async () => ({ id: lease.attemptId })),
    } as unknown as Queue;
    const repository: UrlFrontierRepository = {
      upsertEntry: jest.fn(),
      leaseNext: jest.fn(async () => lease),
      acknowledgeCrawling: jest.fn(),
    };

    const result = await new UrlFrontierDispatchService(
      crawlQueue,
      repository,
    ).dispatchNext({
      leaseOwner: 'worker-1',
      leaseDurationMs: 60_000,
      now: new Date('2026-07-04T00:00:00Z'),
    });

    expect(repository.leaseNext).toHaveBeenCalledWith({
      leaseOwner: 'worker-1',
      leaseDurationMs: 60_000,
      now: new Date('2026-07-04T00:00:00Z'),
    });
    expect(crawlQueue.add).toHaveBeenCalledWith('crawl', lease.command, {
      jobId: 'attempt-1',
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
    expect(result).toEqual({
      leased: true,
      lease,
      jobId: 'attempt-1',
    });
  });

  it('does not dispatch when no frontier entry is leaseable', async () => {
    const crawlQueue = {
      add: jest.fn(),
    } as unknown as Queue;
    const repository: UrlFrontierRepository = {
      upsertEntry: jest.fn(),
      leaseNext: jest.fn(async () => null),
      acknowledgeCrawling: jest.fn(),
    };

    const result = await new UrlFrontierDispatchService(
      crawlQueue,
      repository,
    ).dispatchNext({
      leaseOwner: 'worker-1',
      leaseDurationMs: 60_000,
      now: new Date('2026-07-04T00:00:00Z'),
    });

    expect(crawlQueue.add).not.toHaveBeenCalled();
    expect(result).toEqual({
      leased: false,
      lease: null,
      jobId: null,
    });
  });
});

function frontierLease(): UrlFrontierLease {
  const leaseExpiresAt = new Date('2026-07-04T00:01:00Z');
  return {
    entryId: 'entry-1',
    attemptId: 'attempt-1',
    leaseOwner: 'worker-1',
    leaseExpiresAt,
    command: {
      attemptId: 'attempt-1',
      frontierEntryId: 'entry-1',
      topicId: 'topic-1',
      topicConfigurationVersion: 1,
      normalizedUrl: 'https://example.com/page',
      crawlPolicyFingerprint: 'policy-1',
      leaseExpiresAt,
      deadline: leaseExpiresAt,
      policy: {
        userAgent: 'seo-kb-crawler',
        respectRobots: true,
        maxBodyBytes: 500_000,
        maxRedirects: 5,
        timeoutMs: 30_000,
        maxOutgoingLinks: 100,
        maxMediaAssets: 25,
      },
    },
  };
}
