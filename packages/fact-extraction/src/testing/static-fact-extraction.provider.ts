import { FactExtractionProvider } from '../domain/fact-extraction-provider';
import {
  FactExtractionProviderInput,
  FactExtractionProviderResult,
  FactExtractionProviderIdentity,
  RawFactCandidate,
} from '../domain/fact-extraction-types';

export class StaticFactExtractionProvider implements FactExtractionProvider {
  calls = 0;
  lastInput: FactExtractionProviderInput | null = null;

  constructor(
    readonly identity: FactExtractionProviderIdentity,
    private readonly candidates: RawFactCandidate[],
  ) {}

  async extractFacts(
    input: FactExtractionProviderInput,
  ): Promise<FactExtractionProviderResult> {
    this.calls += 1;
    this.lastInput = input;
    return {
      candidates: this.candidates,
    };
  }
}
