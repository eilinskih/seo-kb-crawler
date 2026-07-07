import {
  EmbeddingProvider,
  EmbeddingProviderInput,
  EmbeddingProviderResult,
  EmbeddingProviderUnavailableError,
} from './embedding-provider';
import { EmbeddingModelIdentity } from './embedding-types';

export class NoEmbeddingProvider implements EmbeddingProvider {
  readonly identity: EmbeddingModelIdentity = {
    providerKey: 'none',
    modelKey: 'not-configured',
    modelVersion: '0',
    dimensions: 0,
  };

  embed(_input: EmbeddingProviderInput[]): Promise<EmbeddingProviderResult[]> {
    return Promise.reject(new EmbeddingProviderUnavailableError());
  }
}
