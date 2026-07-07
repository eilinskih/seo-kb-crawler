import { normalizeChunkText, stableHash } from './chunk-hashing';

describe('chunk hashing', () => {
  it('normalizes whitespace and casing before normalized hashing', () => {
    expect(normalizeChunkText(' Laser   Hair\nRemoval ')).toBe(
      'laser hair removal',
    );
  });

  it('returns stable sha256 hashes', () => {
    expect(stableHash('laser hair removal')).toBe(
      stableHash('laser hair removal'),
    );
    expect(stableHash('laser hair removal')).not.toBe(
      stableHash('laser hair removal prices'),
    );
  });
});
