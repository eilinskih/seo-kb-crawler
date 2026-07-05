import {
  DEFAULT_CONTENT_EXTRACTOR_VERSION,
  ContentProcessingService,
} from './content-processing.service';
import {
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
      findProcessingRecord: jest.fn(),
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
});

function repositoryStub(): ContentProcessingRepository {
  return {
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
