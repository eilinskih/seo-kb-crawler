import { CrawlJobHandler } from '@seo-kb/crawler';
import { Job } from 'bullmq';
import { CrawlProcessor } from './crawl.processor';

describe('CrawlProcessor', () => {
  it('resolves only after CrawlJobHandler completes', async () => {
    const crawlJobHandler = {
      handle: jest.fn(async () => ({
        attemptId: 'attempt-1',
        status: 'succeeded',
      })),
    } as unknown as CrawlJobHandler;

    await expect(
      new CrawlProcessor(crawlJobHandler).process({
        id: 'job-1',
        data: {
          attemptId: 'attempt-1',
        },
      } as Job),
    ).resolves.toBeUndefined();

    expect(crawlJobHandler.handle).toHaveBeenCalledWith({
      attemptId: 'attempt-1',
    });
  });

  it('propagates handler failures so BullMQ does not acknowledge the job', async () => {
    const failure = new Error('result sink unavailable');
    const crawlJobHandler = {
      handle: jest.fn(async () => {
        throw failure;
      }),
    } as unknown as CrawlJobHandler;

    await expect(
      new CrawlProcessor(crawlJobHandler).process({
        id: 'job-1',
        data: {
          attemptId: 'attempt-1',
        },
      } as Job),
    ).rejects.toThrow(failure);
  });
});
