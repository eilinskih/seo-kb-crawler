import { EmbeddingProcessor } from './embedding.processor';
import { EmbeddingService } from '@seo-kb/embeddings';

describe('EmbeddingProcessor', () => {
  it('processes embedding jobs through the embedding service', async () => {
    const service = {
      embedBatch: jest.fn().mockResolvedValue({
        status: 'provider_unavailable',
        embeddingModelId: 'model-1',
        embeddedCount: 0,
        skippedCount: 0,
        failedCount: 1,
      }),
    } as unknown as EmbeddingService;
    const processor = new EmbeddingProcessor(service);

    await processor.process({
      id: 'job-1',
      data: {
        jobId: 'job-1',
        chunkIds: ['chunk-1'],
        providerKey: 'none',
        modelKey: 'not-configured',
        modelVersion: '0',
        dimensions: 0,
        requestedAt: '2026-07-07T00:00:00Z',
      },
    } as never);

    expect(service.embedBatch).toHaveBeenCalledWith({
      chunkIds: ['chunk-1'],
      now: expect.any(Date),
    });
  });
});
