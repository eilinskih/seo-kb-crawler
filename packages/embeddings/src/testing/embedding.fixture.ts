import {
  ChunkForEmbedding,
  EmbeddingModelIdentity,
} from '../domain/embedding-types';

export const testEmbeddingIdentity: EmbeddingModelIdentity = {
  providerKey: 'test-provider',
  modelKey: 'test-model',
  modelVersion: '1',
  dimensions: 3,
};

export function chunkForEmbeddingFixture(
  overrides: Partial<ChunkForEmbedding> = {},
): ChunkForEmbedding {
  return {
    id: 'chunk-1',
    chunkingRunId: 'chunking-run-1',
    documentId: 'document-1',
    documentVersionId: 'document-version-1',
    topicId: 'topic-1',
    text: 'Laser hair removal prices in Warsaw',
    contentHash: 'content-hash-1',
    normalizedTextHash: 'normalized-hash-1',
    tokenCount: 6,
    language: 'en',
    geoHints: [{ countryCode: 'PL', confidence: 0.8, source: 'url' }],
    chunkType: 'section',
    ...overrides,
  };
}
