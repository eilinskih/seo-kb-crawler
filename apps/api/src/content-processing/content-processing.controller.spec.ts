import { BadRequestException } from '@nestjs/common';
import { ContentProcessingService } from '@seo-kb/content-processing';
import { ContentProcessingController } from './content-processing.controller';

describe('ContentProcessingController', () => {
  it('processes a crawl attempt by id', async () => {
    const service = {
      processCrawlAttemptById: jest.fn(async () => ({
        status: 'processed',
        documentId: 'document-1',
        documentVersionId: 'version-1',
      })),
    } as unknown as ContentProcessingService;
    const controller = new ContentProcessingController(service);

    await expect(
      controller.process({
        crawlAttemptId: ' attempt-1 ',
        extractorVersion: ' extractor/1 ',
      }),
    ).resolves.toEqual({
      status: 'processed',
      documentId: 'document-1',
      documentVersionId: 'version-1',
    });
    expect(service.processCrawlAttemptById).toHaveBeenCalledWith({
      crawlAttemptId: 'attempt-1',
      extractorVersion: 'extractor/1',
      now: expect.any(Date),
    });
  });

  it('rejects missing crawl attempt ids', async () => {
    const controller = new ContentProcessingController({
      processCrawlAttemptById: jest.fn(),
    } as unknown as ContentProcessingService);

    await expect(controller.process({})).rejects.toThrow(BadRequestException);
  });

  it('rejects overly long crawl attempt ids', async () => {
    const controller = new ContentProcessingController({
      processCrawlAttemptById: jest.fn(),
    } as unknown as ContentProcessingService);

    await expect(
      controller.process({ crawlAttemptId: 'a'.repeat(101) }),
    ).rejects.toThrow(BadRequestException);
  });
});
