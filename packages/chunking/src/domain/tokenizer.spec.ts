import { WhitespaceTokenizer } from './tokenizer';

describe('WhitespaceTokenizer', () => {
  it('counts trimmed whitespace-delimited tokens deterministically', () => {
    const tokenizer = new WhitespaceTokenizer();

    expect(tokenizer.countTokens('  laser   hair\nremoval  ')).toBe(3);
    expect(tokenizer.countTokens('')).toBe(0);
    expect(tokenizer.key).toBe('local-whitespace');
    expect(tokenizer.version).toBe('1');
  });
});
