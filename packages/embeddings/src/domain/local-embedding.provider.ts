import {
  EmbeddingProvider,
  EmbeddingProviderInput,
  EmbeddingProviderResult,
} from './embedding-provider';
import { EmbeddingModelIdentity } from './embedding-types';

export interface LocalEmbeddingRuntime {
  embedTexts(texts: string[]): Promise<number[][]>;
}

export class LocalEmbeddingProvider implements EmbeddingProvider {
  constructor(
    readonly identity: EmbeddingModelIdentity,
    private readonly runtime: LocalEmbeddingRuntime,
  ) {}

  async embed(
    input: EmbeddingProviderInput[],
  ): Promise<EmbeddingProviderResult[]> {
    const vectors = await this.runtime.embedTexts(
      input.map(({ chunk }) => chunk.text),
    );

    return input.map(({ chunk }, index) => ({
      chunkId: chunk.id,
      vector: vectors[index] ?? [],
    }));
  }
}
