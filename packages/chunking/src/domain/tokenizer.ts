export interface Tokenizer {
  readonly key: string;
  readonly version: string;
  countTokens(text: string): number;
}

export class WhitespaceTokenizer implements Tokenizer {
  readonly key = 'local-whitespace';
  readonly version = '1';

  countTokens(text: string): number {
    const normalized = text.trim();
    if (!normalized) {
      return 0;
    }
    return normalized.split(/\s+/u).length;
  }
}
