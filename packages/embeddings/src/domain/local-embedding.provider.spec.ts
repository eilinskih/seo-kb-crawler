import { LocalEmbeddingProvider } from './local-embedding.provider';

describe('LocalEmbeddingProvider', () => {
  it('maps local runtime vectors back to chunk ids', async () => {
    const provider = new LocalEmbeddingProvider(
      {
        providerKey: 'local',
        modelKey: 'bge-m3',
        modelVersion: 'local-v1',
        dimensions: 2,
      },
      {
        embedTexts: jest.fn().mockResolvedValue([[0.1, 0.2]]),
      },
    );

    const result = await provider.embed([{
      chunk: {
        id: 'chunk-1',
        chunkingRunId: 'run-1',
        documentId: 'document-1',
        documentVersionId: 'version-1',
        topicId: 'topic-1',
        text: 'laser hair removal',
        contentHash: 'hash',
        normalizedTextHash: 'normalized',
        tokenCount: 3,
        language: 'en',
        geoHints: [],
        chunkType: 'section',
      },
    }]);

    expect(result).toEqual([{ chunkId: 'chunk-1', vector: [0.1, 0.2] }]);
  });
});
