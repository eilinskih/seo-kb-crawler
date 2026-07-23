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
    const repository = repositoryDouble({
      leaseNext: jest.fn(async () => lease),
    });

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
    const repository = repositoryDouble({
      leaseNext: jest.fn(async () => null),
    });

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

  it('dispatches a bounded batch until the requested limit is reached', async () => {
    const leases = [frontierLease('attempt-1'), frontierLease('attempt-2')];
    const crawlQueue = {
      add: jest.fn(async () => ({})),
    } as unknown as Queue;
    const repository = repositoryDouble({
      leaseNext: jest
        .fn()
        .mockResolvedValueOnce(leases[0])
        .mockResolvedValueOnce(leases[1]),
    });

    const result = await new UrlFrontierDispatchService(
      crawlQueue,
      repository,
    ).dispatchBatch({
      leaseOwner: 'worker-1',
      leaseDurationMs: 60_000,
      now: new Date('2026-07-04T00:00:00Z'),
      maxDispatches: 2,
    });

    expect(crawlQueue.add).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      requested: 2,
      dispatched: 2,
      jobIds: ['attempt-1', 'attempt-2'],
      exhausted: false,
    });
  });

  it('stops batch dispatch when the frontier is exhausted', async () => {
    const lease = frontierLease('attempt-1');
    const crawlQueue = {
      add: jest.fn(async () => ({})),
    } as unknown as Queue;
    const repository = repositoryDouble({
      leaseNext: jest
        .fn()
        .mockResolvedValueOnce(lease)
        .mockResolvedValueOnce(null),
    });

    const result = await new UrlFrontierDispatchService(
      crawlQueue,
      repository,
    ).dispatchBatch({
      leaseOwner: 'worker-1',
      leaseDurationMs: 60_000,
      now: new Date('2026-07-04T00:00:00Z'),
      maxDispatches: 5,
    });

    expect(crawlQueue.add).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      requested: 5,
      dispatched: 1,
      jobIds: ['attempt-1'],
      exhausted: true,
    });
  });

  it('rejects non-positive batch limits', async () => {
    const service = new UrlFrontierDispatchService(
      { add: jest.fn() } as unknown as Queue,
      repositoryDouble({
        leaseNext: jest.fn(),
      }),
    );

    await expect(
      service.dispatchBatch({
        leaseOwner: 'worker-1',
        leaseDurationMs: 60_000,
        now: new Date('2026-07-04T00:00:00Z'),
        maxDispatches: 0,
      }),
    ).rejects.toThrow('maxDispatches must be a positive integer');
  });
});

function repositoryDouble(
  overrides: Partial<UrlFrontierRepository>,
): UrlFrontierRepository {
  return {
    upsertEntry: jest.fn(),
    appendDiscoveryObservations: jest.fn(async () => []),
    leaseNext: jest.fn(),
    acknowledgeCrawling: jest.fn(),
    ...overrides,
  };
}

function frontierLease(attemptId = 'attempt-1'): UrlFrontierLease {
  const leaseExpiresAt = new Date('2026-07-04T00:01:00Z');
  return {
    entryId: 'entry-1',
    attemptId,
    leaseOwner: 'worker-1',
    leaseExpiresAt,
    command: {
      attemptId,
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
