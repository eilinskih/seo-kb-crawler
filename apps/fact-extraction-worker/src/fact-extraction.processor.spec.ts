import {
  FactExtractionJob,
  FactExtractionService,
} from '@seo-kb/fact-extraction';
import { FactExtractionProcessor } from './fact-extraction.processor';

describe('FactExtractionProcessor', () => {
  it('processes fact extraction jobs through the fact extraction service', async () => {
    const service = {
      extractBatch: jest.fn().mockResolvedValue([
        {
          status: 'provider_unavailable',
          runId: 'run-1',
          rawFactCount: 0,
          canonicalFactCount: 0,
          rejectedCount: 0,
        },
      ]),
    } as unknown as FactExtractionService;
    const processor = new FactExtractionProcessor(service);

    await processor.process({
      id: 'job-1',
      data: {
        jobId: 'job-1',
        chunkIds: ['chunk-1'],
        providerKey: 'none',
        modelKey: 'not-configured',
        modelVersion: '0',
        profileKey: 'default',
        profileVersion: 'fact-extraction/0.1.0',
        requestedAt: '2026-07-23T00:00:00Z',
        reason: 'new_chunk',
      } satisfies FactExtractionJob,
    } as never);

    expect(service.extractBatch).toHaveBeenCalledWith({
      chunkIds: ['chunk-1'],
      now: new Date('2026-07-23T00:00:00Z'),
    });
  });
});
