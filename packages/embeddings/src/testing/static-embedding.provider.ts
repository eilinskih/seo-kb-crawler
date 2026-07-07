import { EmbeddingProvider } from '../domain/embedding-provider';
import {
  ChunkForEmbedding,
  EmbeddingModelIdentity,
} from '../domain/embedding-types';

export class StaticEmbeddingProvider implements EmbeddingProvider {
  calls = 0;

  constructor(readonly identity: EmbeddingModelIdentity) {}

  async embed(input: { chunk: ChunkForEmbedding }[]) {
    this.calls += 1;
    return input.map(({ chunk }) => ({
      chunkId: chunk.id,
      vector: Array.from(
        { length: this.identity.dimensions },
        (_, index) => index + 0.1,
      ),
    }));
  }
}
