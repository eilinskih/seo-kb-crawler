import {
  FactExtractionProvider,
  FactExtractionProviderUnavailableError,
} from './fact-extraction-provider';
import {
  FactExtractionProviderInput,
  FactExtractionProviderResult,
} from './fact-extraction-types';

export class NoFactExtractionProvider implements FactExtractionProvider {
  readonly identity = {
    providerKey: 'none',
    modelKey: 'not-configured',
    modelVersion: '0',
  };

  extractFacts(
    _input: FactExtractionProviderInput,
  ): Promise<FactExtractionProviderResult> {
    return Promise.reject(new FactExtractionProviderUnavailableError());
  }
}
