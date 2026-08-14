import { EmbeddingProviderUnavailableError } from './embedding-provider';
import { OllamaEmbeddingProvider } from './ollama-embedding.provider';

describe('OllamaEmbeddingProvider', () => {
  it('requests batched embeddings from Ollama and maps vectors to chunks', async () => {
    const fetchFn = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        embeddings: [
          [0.1, 0.2],
          [0.3, 0.4],
        ],
      }),
    })) as unknown as typeof fetch;
    const provider = new OllamaEmbeddingProvider({
      baseUrl: 'http://ollama.local:11434/',
      model: 'bge-m3',
      modelVersion: 'local',
      dimensions: 2,
      fetchFn,
    });

    await expect(
      provider.embed([
        { chunk: chunk('chunk-1', 'Laser hair removal') },
        { chunk: chunk('chunk-2', 'Depilacja laserowa') },
      ]),
    ).resolves.toEqual([
      { chunkId: 'chunk-1', vector: [0.1, 0.2] },
      { chunkId: 'chunk-2', vector: [0.3, 0.4] },
    ]);
    expect(fetchFn).toHaveBeenCalledWith(
      'http://ollama.local:11434/api/embed',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          model: 'bge-m3',
          input: ['Laser hair removal', 'Depilacja laserowa'],
        }),
      }),
    );
  });

  it('reports provider unavailable when Ollama cannot be reached', async () => {
    const provider = new OllamaEmbeddingProvider({
      baseUrl: 'http://ollama.local:11434',
      model: 'bge-m3',
      dimensions: 1024,
      fetchFn: jest.fn(async () => {
        throw new Error('connect refused');
      }) as unknown as typeof fetch,
    });

    await expect(
      provider.embed([{ chunk: chunk('chunk-1', 'Laser hair removal') }]),
    ).rejects.toThrow(EmbeddingProviderUnavailableError);
  });
});

function chunk(id: string, text: string) {
  return {
    id,
    chunkingRunId: 'run-1',
    documentId: 'document-1',
    documentVersionId: 'version-1',
    topicId: 'topic-1',
    text,
    contentHash: 'hash',
    normalizedTextHash: 'normalized',
    tokenCount: 3,
    language: 'en',
    geoHints: [],
    chunkType: 'section' as const,
  };
}
