import { reusableContentVersion } from './document-versioning';

describe('reusableContentVersion', () => {
  it('reuses a previous version when content reverts to an older hash', () => {
    expect(
      reusableContentVersion(
        [
          {
            id: 'version-a',
            contentHash: 'hash-a',
            extractorVersion: 'content-processor/0.1.0',
          },
          {
            id: 'version-b',
            contentHash: 'hash-b',
            extractorVersion: 'content-processor/0.1.0',
          },
        ],
        {
          contentHash: 'hash-a',
          extractorVersion: 'content-processor/0.1.0',
        },
      ),
    ).toEqual({
      id: 'version-a',
      contentHash: 'hash-a',
      extractorVersion: 'content-processor/0.1.0',
    });
  });

  it('does not reuse versions across extractor versions', () => {
    expect(
      reusableContentVersion(
        [
          {
            id: 'version-a',
            contentHash: 'hash-a',
            extractorVersion: 'content-processor/0.1.0',
          },
        ],
        {
          contentHash: 'hash-a',
          extractorVersion: 'content-processor/0.2.0',
        },
      ),
    ).toBeNull();
  });
});
