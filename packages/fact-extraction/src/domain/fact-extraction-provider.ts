import {
  FactExtractionProviderInput,
  FactExtractionProviderResult,
  FactExtractionProviderIdentity,
} from './fact-extraction-types';

export interface FactExtractionProvider {
  readonly identity: FactExtractionProviderIdentity;
  extractFacts(
    input: FactExtractionProviderInput,
  ): Promise<FactExtractionProviderResult>;
}

export class FactExtractionProviderUnavailableError extends Error {
  constructor(message = 'Fact extraction provider is not configured') {
    super(message);
    this.name = 'FactExtractionProviderUnavailableError';
  }
}
