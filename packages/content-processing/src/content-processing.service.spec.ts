import {
  DEFAULT_CONTENT_EXTRACTOR_VERSION,
  ContentProcessingService,
} from './content-processing.service';
import {
  ContentProcessingRecord,
  ContentProcessingRepository,
  CrawlAttemptForProcessing,
  ProcessCrawlAttemptResult,
} from './domain/content-processing-types';

describe('ContentProcessingService', () => {
  it('processes successful crawl attempts through the repository boundary', async () => {
    const result: ProcessCrawlAttemptResult = {
      status: 'processed',
      documentId: 'document-1',
      documentVersionId: 'version-1',
    };
    const repository: ContentProcessingRepository = {
      findSuccessfulCrawlAttempt: jest.fn(),
      findPendingSuccessfulCrawlAttempts: jest.fn(),
      markProcessingPending: jest.fn(),
      markProcessingStarted: jest.fn(),
      markProcessingFailed: jest.fn(),
      findProcessingRecord: jest.fn(async () => null),
      processSuccessfulCrawlAttempt: jest.fn(async () => result),
    };
    const service = new ContentProcessingService(repository);
    const now = new Date('2026-07-04T00:00:00Z');

    await expect(
      service.processCrawlAttempt(successfulAttempt(), {
        crawlAttemptId: 'attempt-1',
        now,
      }),
    ).resolves.toEqual({
      status: 'processed',
      documentId: 'document-1',
      documentVersionId: 'version-1',
    });

    expect(repository.processSuccessfulCrawlAttempt).toHaveBeenCalledWith(
      successfulAttempt(),
      {
        now,
        extractorVersion: DEFAULT_CONTENT_EXTRACTOR_VERSION,
      },
    );
  });

  it('rejects attempts that do not match the requested crawl attempt id', async () => {
    const service = new ContentProcessingService(repositoryStub());

    await expect(
      service.processCrawlAttempt(successfulAttempt(), {
        crawlAttemptId: 'other-attempt',
        now: new Date('2026-07-04T00:00:00Z'),
      }),
    ).rejects.toThrow('crawlAttemptId must match');
  });

  it('loads successful crawl attempts by id before processing', async () => {
    const result: ProcessCrawlAttemptResult = {
      status: 'processed',
      documentId: 'document-1',
      documentVersionId: 'version-1',
    };
    const repository: ContentProcessingRepository = {
      findSuccessfulCrawlAttempt: jest.fn(async () => successfulAttempt()),
      findPendingSuccessfulCrawlAttempts: jest.fn(),
      markProcessingPending: jest.fn(),
      markProcessingStarted: jest.fn(),
      markProcessingFailed: jest.fn(),
      findProcessingRecord: jest.fn(),
      processSuccessfulCrawlAttempt: jest.fn(async () => result),
    };
    const service = new ContentProcessingService(repository);
    const now = new Date('2026-07-04T00:00:00Z');

    await service.processCrawlAttemptById({
      crawlAttemptId: 'attempt-1',
      now,
    });

    expect(repository.findSuccessfulCrawlAttempt).toHaveBeenCalledWith(
      'attempt-1',
    );
    expect(repository.markProcessingStarted).toHaveBeenCalledWith({
      crawlAttemptId: 'attempt-1',
      extractorVersion: DEFAULT_CONTENT_EXTRACTOR_VERSION,
      now,
    });
    expect(repository.processSuccessfulCrawlAttempt).toHaveBeenCalledWith(
      successfulAttempt(),
      {
        now,
        extractorVersion: DEFAULT_CONTENT_EXTRACTOR_VERSION,
      },
    );
  });

  it('rejects missing successful crawl attempts by id', async () => {
    const repository: ContentProcessingRepository = {
      findSuccessfulCrawlAttempt: jest.fn(async () => null),
      findPendingSuccessfulCrawlAttempts: jest.fn(),
      markProcessingPending: jest.fn(),
      markProcessingStarted: jest.fn(),
      markProcessingFailed: jest.fn(),
      findProcessingRecord: jest.fn(async () => null),
      processSuccessfulCrawlAttempt: jest.fn(),
    };
    const service = new ContentProcessingService(repository);

    await expect(
      service.processCrawlAttemptById({
        crawlAttemptId: 'missing-attempt',
        now: new Date('2026-07-04T00:00:00Z'),
      }),
    ).rejects.toThrow('successful crawl attempt was not found');
    expect(repository.markProcessingStarted).not.toHaveBeenCalled();
  });

  it('does not mutate terminal failure records through the public by-id path', async () => {
    const failedRecord: ContentProcessingRecord = {
      crawlAttemptId: 'attempt-1',
      documentId: null,
      documentVersionId: null,
      status: 'failed_terminal',
      failure: {
        category: 'missing_body',
        detail: 'successful crawl attempt has no usable body',
        retryable: false,
      },
      extractorVersion: DEFAULT_CONTENT_EXTRACTOR_VERSION,
      startedAt: new Date('2026-07-04T00:00:00Z'),
      completedAt: new Date('2026-07-04T00:00:00Z'),
      createdAt: new Date('2026-07-04T00:00:00Z'),
      updatedAt: new Date('2026-07-04T00:00:00Z'),
    };
    const repository: ContentProcessingRepository = {
      findSuccessfulCrawlAttempt: jest.fn(),
      findPendingSuccessfulCrawlAttempts: jest.fn(),
      markProcessingPending: jest.fn(),
      markProcessingStarted: jest.fn(),
      markProcessingFailed: jest.fn(),
      findProcessingRecord: jest.fn(async () => failedRecord),
      processSuccessfulCrawlAttempt: jest.fn(),
    };
    const service = new ContentProcessingService(repository);

    await expect(
      service.processCrawlAttemptById({
        crawlAttemptId: 'attempt-1',
        now: new Date('2026-07-05T00:00:00Z'),
      }),
    ).rejects.toThrow('processing run failed terminally');

    expect(repository.findSuccessfulCrawlAttempt).not.toHaveBeenCalled();
    expect(repository.markProcessingStarted).not.toHaveBeenCalled();
    expect(repository.markProcessingFailed).not.toHaveBeenCalled();
    expect(repository.processSuccessfulCrawlAttempt).not.toHaveBeenCalled();
  });

  it('rejects successful attempts without usable body artifacts', async () => {
    const service = new ContentProcessingService(repositoryStub());

    await expect(
      service.processCrawlAttempt(
        {
          ...successfulAttempt(),
          rawHtml: null,
          cleanedMarkdown: null,
          plainText: null,
        },
        {
          crawlAttemptId: 'attempt-1',
          now: new Date('2026-07-04T00:00:00Z'),
        },
      ),
    ).rejects.toThrow('no usable body');
  });

  it('marks queued crawl attempts as processing before processing them', async () => {
    const result: ProcessCrawlAttemptResult = {
      status: 'processed',
      documentId: 'document-1',
      documentVersionId: 'version-1',
    };
    const repository: ContentProcessingRepository = {
      findSuccessfulCrawlAttempt: jest.fn(async () => successfulAttempt()),
      findPendingSuccessfulCrawlAttempts: jest.fn(),
      markProcessingPending: jest.fn(),
      markProcessingStarted: jest.fn(),
      markProcessingFailed: jest.fn(),
      findProcessingRecord: jest.fn(),
      processSuccessfulCrawlAttempt: jest.fn(async () => result),
    };
    const service = new ContentProcessingService(repository);
    const now = new Date('2026-07-04T00:00:00Z');

    await expect(
      service.processQueuedCrawlAttempt({
        crawlAttemptId: 'attempt-1',
        extractorVersion: 'extractor/1',
        now,
      }),
    ).resolves.toEqual(result);

    expect(repository.markProcessingStarted).toHaveBeenCalledWith({
      crawlAttemptId: 'attempt-1',
      extractorVersion: 'extractor/1',
      now,
    });
    expect(repository.markProcessingFailed).not.toHaveBeenCalled();
  });

  it('records terminal failures for queued attempts with missing body artifacts', async () => {
    const repository: ContentProcessingRepository = {
      findSuccessfulCrawlAttempt: jest.fn(async () => ({
        ...successfulAttempt(),
        rawHtml: null,
        cleanedMarkdown: null,
        plainText: null,
      })),
      findPendingSuccessfulCrawlAttempts: jest.fn(),
      markProcessingPending: jest.fn(),
      markProcessingStarted: jest.fn(),
      markProcessingFailed: jest.fn(),
      findProcessingRecord: jest.fn(),
      processSuccessfulCrawlAttempt: jest.fn(),
    };
    const service = new ContentProcessingService(repository);
    const now = new Date('2026-07-04T00:00:00Z');

    await expect(
      service.processQueuedCrawlAttempt({
        crawlAttemptId: 'attempt-1',
        now,
      }),
    ).rejects.toThrow('no usable body');

    expect(repository.markProcessingFailed).toHaveBeenCalledWith({
      crawlAttemptId: 'attempt-1',
      extractorVersion: DEFAULT_CONTENT_EXTRACTOR_VERSION,
      now,
      failure: {
        category: 'missing_body',
        detail: 'successful crawl attempt has no usable body',
        retryable: false,
      },
    });
  });

  it('does not mutate terminal processing records during tracked replays', async () => {
    const processedRecord: ContentProcessingRecord = {
      crawlAttemptId: 'attempt-1',
      documentId: 'document-1',
      documentVersionId: 'version-1',
      status: 'processed',
      failure: null,
      extractorVersion: DEFAULT_CONTENT_EXTRACTOR_VERSION,
      startedAt: new Date('2026-07-04T00:00:00Z'),
      completedAt: new Date('2026-07-04T00:00:00Z'),
      createdAt: new Date('2026-07-04T00:00:00Z'),
      updatedAt: new Date('2026-07-04T00:00:00Z'),
    };
    const repository: ContentProcessingRepository = {
      findSuccessfulCrawlAttempt: jest.fn(),
      findPendingSuccessfulCrawlAttempts: jest.fn(),
      markProcessingPending: jest.fn(),
      markProcessingStarted: jest.fn(),
      markProcessingFailed: jest.fn(),
      findProcessingRecord: jest.fn(async () => processedRecord),
      processSuccessfulCrawlAttempt: jest.fn(),
    };
    const service = new ContentProcessingService(repository);

    await expect(
      service.processManualCrawlAttempt({
        crawlAttemptId: 'attempt-1',
        now: new Date('2026-07-05T00:00:00Z'),
      }),
    ).resolves.toEqual({
      status: 'already_processed',
      documentId: 'document-1',
      documentVersionId: 'version-1',
    });

    expect(repository.findSuccessfulCrawlAttempt).not.toHaveBeenCalled();
    expect(repository.markProcessingStarted).not.toHaveBeenCalled();
    expect(repository.processSuccessfulCrawlAttempt).not.toHaveBeenCalled();
  });

  it('does not mutate terminal failure records during tracked replays', async () => {
    const failedRecord: ContentProcessingRecord = {
      crawlAttemptId: 'attempt-1',
      documentId: null,
      documentVersionId: null,
      status: 'failed_terminal',
      failure: {
        category: 'missing_body',
        detail: 'successful crawl attempt has no usable body',
        retryable: false,
      },
      extractorVersion: DEFAULT_CONTENT_EXTRACTOR_VERSION,
      startedAt: new Date('2026-07-04T00:00:00Z'),
      completedAt: new Date('2026-07-04T00:00:00Z'),
      createdAt: new Date('2026-07-04T00:00:00Z'),
      updatedAt: new Date('2026-07-04T00:00:00Z'),
    };
    const repository: ContentProcessingRepository = {
      findSuccessfulCrawlAttempt: jest.fn(),
      findPendingSuccessfulCrawlAttempts: jest.fn(),
      markProcessingPending: jest.fn(),
      markProcessingStarted: jest.fn(),
      markProcessingFailed: jest.fn(),
      findProcessingRecord: jest.fn(async () => failedRecord),
      processSuccessfulCrawlAttempt: jest.fn(),
    };
    const service = new ContentProcessingService(repository);

    await expect(
      service.processManualCrawlAttempt({
        crawlAttemptId: 'attempt-1',
        now: new Date('2026-07-05T00:00:00Z'),
      }),
    ).rejects.toThrow('processing run failed terminally');

    expect(repository.findSuccessfulCrawlAttempt).not.toHaveBeenCalled();
    expect(repository.markProcessingStarted).not.toHaveBeenCalled();
    expect(repository.markProcessingFailed).not.toHaveBeenCalled();
    expect(repository.processSuccessfulCrawlAttempt).not.toHaveBeenCalled();
  });

  it('records terminal failures for manual attempts with missing body artifacts', async () => {
    const repository: ContentProcessingRepository = {
      findSuccessfulCrawlAttempt: jest.fn(async () => ({
        ...successfulAttempt(),
        rawHtml: null,
        cleanedMarkdown: null,
        plainText: null,
      })),
      findPendingSuccessfulCrawlAttempts: jest.fn(),
      markProcessingPending: jest.fn(),
      markProcessingStarted: jest.fn(),
      markProcessingFailed: jest.fn(),
      findProcessingRecord: jest.fn(),
      processSuccessfulCrawlAttempt: jest.fn(),
    };
    const service = new ContentProcessingService(repository);
    const now = new Date('2026-07-04T00:00:00Z');

    await expect(
      service.processManualCrawlAttempt({
        crawlAttemptId: 'attempt-1',
        now,
      }),
    ).rejects.toThrow('no usable body');

    expect(repository.markProcessingStarted).toHaveBeenCalledWith({
      crawlAttemptId: 'attempt-1',
      extractorVersion: DEFAULT_CONTENT_EXTRACTOR_VERSION,
      now,
    });
    expect(repository.markProcessingFailed).toHaveBeenCalledWith({
      crawlAttemptId: 'attempt-1',
      extractorVersion: DEFAULT_CONTENT_EXTRACTOR_VERSION,
      now,
      failure: {
        category: 'missing_body',
        detail: 'successful crawl attempt has no usable body',
        retryable: false,
      },
    });
  });

  it('treats missing manual crawl attempts as validation failures before state mutation', async () => {
    const repository: ContentProcessingRepository = {
      findSuccessfulCrawlAttempt: jest.fn(async () => null),
      findPendingSuccessfulCrawlAttempts: jest.fn(),
      markProcessingPending: jest.fn(),
      markProcessingStarted: jest.fn(),
      markProcessingFailed: jest.fn(),
      findProcessingRecord: jest.fn(async () => null),
      processSuccessfulCrawlAttempt: jest.fn(),
    };
    const service = new ContentProcessingService(repository);

    await expect(
      service.processManualCrawlAttempt({
        crawlAttemptId: 'missing-attempt',
        now: new Date('2026-07-05T00:00:00Z'),
      }),
    ).rejects.toThrow('successful crawl attempt was not found');

    expect(repository.markProcessingStarted).not.toHaveBeenCalled();
    expect(repository.markProcessingFailed).not.toHaveBeenCalled();
  });
});

function repositoryStub(): ContentProcessingRepository {
  return {
    findSuccessfulCrawlAttempt: jest.fn(),
    findPendingSuccessfulCrawlAttempts: jest.fn(),
    markProcessingPending: jest.fn(),
    markProcessingStarted: jest.fn(),
    markProcessingFailed: jest.fn(),
    findProcessingRecord: jest.fn(),
    processSuccessfulCrawlAttempt: jest.fn(),
  };
}

function successfulAttempt(): CrawlAttemptForProcessing {
  return {
    attemptId: 'attempt-1',
    frontierEntryId: 'frontier-1',
    topicId: '00000000-0000-4000-8000-000000000001',
    topicConfigurationVersion: 1,
    requestedUrl: 'https://example.com/page',
    status: 'succeeded',
    finalUrl: 'https://example.com/page',
    canonicalUrl: 'https://example.com/page',
    title: 'Example',
    metaDescription: 'Description',
    rawHtml: '<html><title>Example</title></html>',
    cleanedMarkdown: '# Example',
    plainText: 'Example',
    contentHash: 'hash',
    headers: {
      'content-type': 'text/html',
    },
    recordedAt: new Date('2026-07-04T00:00:00Z'),
  };
}
