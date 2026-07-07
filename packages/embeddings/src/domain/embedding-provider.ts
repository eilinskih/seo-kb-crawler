import { ChunkForEmbedding, EmbeddingModelIdentity } from './embedding-types';

export interface EmbeddingProviderInput {
  chunk: ChunkForEmbedding;
}

export interface EmbeddingProviderResult {
  chunkId: string;
  vector: number[];
}

export interface EmbeddingProvider {
  readonly identity: EmbeddingModelIdentity;
  embed(input: EmbeddingProviderInput[]): Promise<EmbeddingProviderResult[]>;
}

export class EmbeddingProviderUnavailableError extends Error {
  constructor(message = 'Embedding provider is not configured') {
    super(message);
    this.name = 'EmbeddingProviderUnavailableError';
  }
}
