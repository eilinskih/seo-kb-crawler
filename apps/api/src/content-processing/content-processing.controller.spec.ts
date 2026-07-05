import { BadRequestException } from '@nestjs/common';
import {
  ContentProcessingDispatchService,
  ContentProcessingService,
} from '@seo-kb/content-processing';
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
    const controller = new ContentProcessingController(
      service,
      dispatchServiceStub(),
    );

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
    const controller = new ContentProcessingController(
      {
        processCrawlAttemptById: jest.fn(),
      } as unknown as ContentProcessingService,
      dispatchServiceStub(),
    );

    await expect(controller.process({})).rejects.toThrow(BadRequestException);
  });

  it('rejects overly long crawl attempt ids', async () => {
    const controller = new ContentProcessingController(
      {
        processCrawlAttemptById: jest.fn(),
      } as unknown as ContentProcessingService,
      dispatchServiceStub(),
    );

    await expect(
      controller.process({ crawlAttemptId: 'a'.repeat(101) }),
    ).rejects.toThrow(BadRequestException);
  });

  it('dispatches pending successful attempts to the content processing queue', async () => {
    const dispatchService = {
      dispatchPendingSuccessfulAttempts: jest.fn(async () => ({
        requested: 2,
        dispatched: 2,
        jobIds: ['attempt-1', 'attempt-2'],
        exhausted: false,
      })),
    } as unknown as ContentProcessingDispatchService;
    const controller = new ContentProcessingController(
      {
        processCrawlAttemptById: jest.fn(),
      } as unknown as ContentProcessingService,
      dispatchService,
    );

    await expect(
      controller.dispatch({
        maxDispatches: 2,
        extractorVersion: ' extractor/1 ',
      }),
    ).resolves.toEqual({
      requested: 2,
      dispatched: 2,
      jobIds: ['attempt-1', 'attempt-2'],
      exhausted: false,
    });
    expect(
      dispatchService.dispatchPendingSuccessfulAttempts,
    ).toHaveBeenCalledWith({
      maxDispatches: 2,
      extractorVersion: 'extractor/1',
    });
  });

  it('rejects overly large content processing dispatch batches', async () => {
    const controller = new ContentProcessingController(
      {
        processCrawlAttemptById: jest.fn(),
      } as unknown as ContentProcessingService,
      dispatchServiceStub(),
    );

    await expect(
      controller.dispatch({ maxDispatches: 101 }),
    ).rejects.toThrow(BadRequestException);
  });
});

function dispatchServiceStub(): ContentProcessingDispatchService {
  return {
    dispatchPendingSuccessfulAttempts: jest.fn(),
  } as unknown as ContentProcessingDispatchService;
}
