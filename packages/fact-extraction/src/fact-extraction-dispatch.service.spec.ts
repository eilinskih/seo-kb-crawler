import { Queue } from 'bullmq';
import { FactExtractionDispatchService } from './fact-extraction-dispatch.service';
import { FactExtractionService } from './fact-extraction.service';
import { StaticFactExtractionProvider } from './testing/static-fact-extraction.provider';

describe('FactExtractionDispatchService', () => {
  it('batches candidates and enqueues retryable fact extraction jobs', async () => {
    const factExtractionService = {
      findCandidates: jest.fn().mockResolvedValue([
        { id: 'chunk-1' },
        { id: 'chunk-2' },
        { id: 'chunk-3' },
      ]),
    } as unknown as FactExtractionService;
    const queue = {
      add: jest.fn().mockResolvedValue(undefined),
    } as unknown as Queue;
    const service = new FactExtractionDispatchService(
      factExtractionService,
      new StaticFactExtractionProvider({
        providerKey: 'test-provider',
        modelKey: 'test-model',
        modelVersion: '1',
      }, []),
      queue,
    );

    const result = await service.dispatchMissingFactExtraction({
      limit: 10,
      batchSize: 2,
      now: new Date('2026-07-23T00:00:00Z'),
    });

    expect(result).toEqual({ candidateCount: 3, enqueuedJobCount: 2 });
    expect(queue.add).toHaveBeenCalledTimes(2);
    expect(queue.add).toHaveBeenNthCalledWith(
      1,
      'fact-extraction',
      expect.objectContaining({
        chunkIds: ['chunk-1', 'chunk-2'],
        providerKey: 'test-provider',
        profileKey: 'default',
      }),
      expect.objectContaining({
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
      }),
    );
  });
});
