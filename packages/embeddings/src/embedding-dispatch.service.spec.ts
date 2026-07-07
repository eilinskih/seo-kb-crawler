import { Queue } from 'bullmq';
import { EmbeddingDispatchService } from './embedding-dispatch.service';
import { EmbeddingService } from './embedding.service';
import { StaticEmbeddingProvider } from './testing/static-embedding.provider';
import {
  chunkForEmbeddingFixture,
  testEmbeddingIdentity,
} from './testing/embedding.fixture';

describe('EmbeddingDispatchService', () => {
  it('batches candidates and enqueues retryable embedding jobs', async () => {
    const embeddingService = {
      findCandidates: jest.fn().mockResolvedValue([
        chunkForEmbeddingFixture({ id: 'chunk-1' }),
        chunkForEmbeddingFixture({ id: 'chunk-2' }),
        chunkForEmbeddingFixture({ id: 'chunk-3' }),
      ]),
    } as unknown as EmbeddingService;
    const queue = {
      add: jest.fn().mockResolvedValue(undefined),
    } as unknown as Queue;
    const service = new EmbeddingDispatchService(
      embeddingService,
      new StaticEmbeddingProvider(testEmbeddingIdentity),
      queue,
    );

    const result = await service.dispatchMissingEmbeddings({
      limit: 10,
      batchSize: 2,
      now: new Date('2026-07-07T10:00:00Z'),
    });

    expect(result).toEqual({ candidateCount: 3, enqueuedJobCount: 2 });
    expect(queue.add).toHaveBeenCalledTimes(2);
    expect(queue.add).toHaveBeenNthCalledWith(
      1,
      'embedding',
      expect.objectContaining({
        chunkIds: ['chunk-1', 'chunk-2'],
        providerKey: 'test-provider',
      }),
      expect.objectContaining({
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
      }),
    );
  });
});
