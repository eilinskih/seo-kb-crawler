import { Queue } from 'bullmq';
import { ContentProcessingDispatchService } from './content-processing-dispatch.service';
import {
  ContentProcessingRepository,
  CrawlAttemptForProcessing,
} from './domain/content-processing-types';

describe('ContentProcessingDispatchService', () => {
  it('dispatches pending successful crawl attempts to BullMQ', async () => {
    const queue = {
      add: jest.fn(),
    } as unknown as Queue;
    const repository: ContentProcessingRepository = {
      findSuccessfulCrawlAttempt: jest.fn(),
      findPendingSuccessfulCrawlAttempts: jest.fn(async () => [
        successfulAttempt('attempt-1'),
        successfulAttempt('attempt-2'),
      ]),
      markProcessingPending: jest.fn(),
      markProcessingStarted: jest.fn(),
      markProcessingFailed: jest.fn(),
      findProcessingRecord: jest.fn(),
      processSuccessfulCrawlAttempt: jest.fn(),
    };
    const service = new ContentProcessingDispatchService(queue, repository);

    await expect(
      service.dispatchPendingSuccessfulAttempts({
        maxDispatches: 2,
        extractorVersion: 'extractor/1',
      }),
    ).resolves.toEqual({
      requested: 2,
      dispatched: 2,
      jobIds: ['attempt-1', 'attempt-2'],
      exhausted: false,
    });

    expect(repository.findPendingSuccessfulCrawlAttempts).toHaveBeenCalledWith({
      limit: 2,
    });
    expect(repository.markProcessingPending).toHaveBeenCalledWith({
      crawlAttemptId: 'attempt-1',
      extractorVersion: 'extractor/1',
      now: expect.any(Date),
    });
    expect(queue.add).toHaveBeenCalledWith(
      'content-processing',
      {
        crawlAttemptId: 'attempt-1',
        extractorVersion: 'extractor/1',
      },
      {
        jobId: 'attempt-1',
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );
  });

  it('reports exhaustion when fewer attempts are available than requested', async () => {
    const service = new ContentProcessingDispatchService(
      { add: jest.fn() } as unknown as Queue,
      {
        findSuccessfulCrawlAttempt: jest.fn(),
        findPendingSuccessfulCrawlAttempts: jest.fn(async () => []),
        markProcessingPending: jest.fn(),
        markProcessingStarted: jest.fn(),
        markProcessingFailed: jest.fn(),
        findProcessingRecord: jest.fn(),
        processSuccessfulCrawlAttempt: jest.fn(),
      },
    );

    await expect(
      service.dispatchPendingSuccessfulAttempts({ maxDispatches: 3 }),
    ).resolves.toEqual({
      requested: 3,
      dispatched: 0,
      jobIds: [],
      exhausted: true,
    });
  });

  it('rejects invalid batch sizes before querying the repository', async () => {
    const repository = {
      findSuccessfulCrawlAttempt: jest.fn(),
      findPendingSuccessfulCrawlAttempts: jest.fn(),
      markProcessingPending: jest.fn(),
      markProcessingStarted: jest.fn(),
      markProcessingFailed: jest.fn(),
      findProcessingRecord: jest.fn(),
      processSuccessfulCrawlAttempt: jest.fn(),
    } as unknown as ContentProcessingRepository;
    const service = new ContentProcessingDispatchService(
      { add: jest.fn() } as unknown as Queue,
      repository,
    );

    await expect(
      service.dispatchPendingSuccessfulAttempts({ maxDispatches: 0 }),
    ).rejects.toThrow('maxDispatches must be a positive integer');
    expect(repository.findPendingSuccessfulCrawlAttempts).not.toHaveBeenCalled();
  });
});

function successfulAttempt(attemptId: string): CrawlAttemptForProcessing {
  return {
    attemptId,
    frontierEntryId: 'frontier-1',
    topicId: '00000000-0000-4000-8000-000000000001',
    topicConfigurationVersion: 1,
    requestedUrl: 'https://example.com/page',
    status: 'succeeded',
    finalUrl: 'https://example.com/page',
    canonicalUrl: null,
    title: 'Example',
    metaDescription: null,
    rawHtml: '<html></html>',
    cleanedMarkdown: '# Example',
    plainText: 'Example',
    contentHash: 'hash-1',
    headers: {},
    recordedAt: new Date('2026-07-04T00:00:00Z'),
  };
}
