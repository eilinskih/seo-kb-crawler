import {
  EmbeddingProvider,
  EmbeddingProviderInput,
  EmbeddingProviderResult,
  EmbeddingProviderUnavailableError,
} from './embedding-provider';
import { EmbeddingModelIdentity } from './embedding-types';

export interface OllamaEmbeddingProviderOptions {
  baseUrl: string;
  model: string;
  dimensions: number;
  modelVersion?: string;
  fetchFn?: typeof fetch;
}

interface OllamaEmbedResponse {
  embeddings?: number[][];
}

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly identity: EmbeddingModelIdentity;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(private readonly options: OllamaEmbeddingProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/u, '');
    this.fetchFn = options.fetchFn ?? fetch;
    this.identity = {
      providerKey: 'ollama',
      modelKey: options.model,
      modelVersion: options.modelVersion ?? 'local',
      dimensions: options.dimensions,
    };
  }

  async embed(
    input: EmbeddingProviderInput[],
  ): Promise<EmbeddingProviderResult[]> {
    if (input.length === 0) {
      return [];
    }

    const response = await this.requestEmbeddings(
      input.map(({ chunk }) => chunk.text),
    );
    if (response.embeddings?.length !== input.length) {
      throw new Error('Ollama returned an unexpected embedding count');
    }

    return input.map(({ chunk }, index) => ({
      chunkId: chunk.id,
      vector: response.embeddings![index],
    }));
  }

  private async requestEmbeddings(input: string[]): Promise<OllamaEmbedResponse> {
    let response: Response;
    try {
      response = await this.fetchFn(`${this.baseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: this.options.model,
          input,
        }),
      });
    } catch (error) {
      throw new EmbeddingProviderUnavailableError(
        `Ollama embedding provider unavailable: ${errorMessage(error)}`,
      );
    }

    if (!response.ok) {
      throw new EmbeddingProviderUnavailableError(
        `Ollama embedding provider returned HTTP ${response.status}`,
      );
    }

    return response.json() as Promise<OllamaEmbedResponse>;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
