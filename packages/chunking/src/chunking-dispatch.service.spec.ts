import { ChunkingDispatchService } from './chunking-dispatch.service';

describe('ChunkingDispatchService', () => {
  it('chunks bounded unchunked document versions', async () => {
    const repository = {
      findUnchunkedDocumentVersionIds: jest.fn(async () => [
        'document-version-1',
        'document-version-2',
      ]),
    };
    const chunkingService = {
      chunkDocumentVersion: jest.fn()
        .mockResolvedValueOnce({
          status: 'chunked',
          runId: 'run-1',
          documentVersionId: 'document-version-1',
          chunkCount: 2,
        })
        .mockResolvedValueOnce({
          status: 'already_chunked',
          runId: 'run-2',
          documentVersionId: 'document-version-2',
          chunkCount: 3,
        }),
    };
    const service = new ChunkingDispatchService(
      repository as never,
      chunkingService as never,
    );
    const now = new Date('2026-08-13T00:00:00.000Z');

    const result = await service.dispatchUnchunkedDocumentVersions({
      limit: 2,
      now,
    });

    expect(repository.findUnchunkedDocumentVersionIds).toHaveBeenCalledWith({
      limit: 2,
    });
    expect(chunkingService.chunkDocumentVersion).toHaveBeenCalledWith({
      documentVersionId: 'document-version-1',
      now,
    });
    expect(result).toEqual(expect.objectContaining({
      candidateCount: 2,
      chunkedCount: 1,
      alreadyChunkedCount: 1,
    }));
  });
});
