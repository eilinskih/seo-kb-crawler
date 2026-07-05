import { ContentProcessingService } from '@seo-kb/content-processing';
import { Job } from 'bullmq';
import { ContentProcessingProcessor } from './content-processing.processor';

describe('ContentProcessingProcessor', () => {
  it('processes content jobs by crawl attempt id', async () => {
    const contentProcessingService = {
      processQueuedCrawlAttempt: jest.fn(async () => ({
        status: 'processed',
        documentId: 'document-1',
        documentVersionId: 'version-1',
      })),
    } as unknown as ContentProcessingService;

    await expect(
      new ContentProcessingProcessor(contentProcessingService).process({
        id: 'attempt-1',
        data: {
          crawlAttemptId: 'attempt-1',
          extractorVersion: 'extractor/1',
        },
      } as Job),
    ).resolves.toBeUndefined();

    expect(
      contentProcessingService.processQueuedCrawlAttempt,
    ).toHaveBeenCalledWith({
      crawlAttemptId: 'attempt-1',
      extractorVersion: 'extractor/1',
      now: expect.any(Date),
    });
  });

  it('propagates processing failures so BullMQ does not acknowledge the job', async () => {
    const failure = new Error('database unavailable');
    const contentProcessingService = {
      processQueuedCrawlAttempt: jest.fn(async () => {
        throw failure;
      }),
    } as unknown as ContentProcessingService;

    await expect(
      new ContentProcessingProcessor(contentProcessingService).process({
        id: 'attempt-1',
        data: {
          crawlAttemptId: 'attempt-1',
        },
      } as Job),
    ).rejects.toThrow(failure);
  });
});
