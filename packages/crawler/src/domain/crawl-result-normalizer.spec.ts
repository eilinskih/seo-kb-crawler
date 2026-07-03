import { CrawlResultNormalizer } from './crawl-result-normalizer';
import { createCrawlCommand } from './crawl-command';
import { CrawlerValidationError } from './crawler-errors';

describe('CrawlResultNormalizer', () => {
  const command = createCrawlCommand({
    attemptId: 'attempt-1',
    frontierEntryId: 'frontier-1',
    topicId: 'topic-1',
    topicConfigurationVersion: 1,
    normalizedUrl: 'https://example.com/page',
    crawlPolicyFingerprint: 'policy-1',
    leaseExpiresAt: '2026-07-03T10:01:00Z',
    deadline: '2026-07-03T10:00:30Z',
    policy: {
      userAgent: 'seo-kb-crawler',
      respectRobots: true,
      maxBodyBytes: 500_000,
      maxRedirects: 5,
      timeoutMs: 30_000,
      maxOutgoingLinks: 1,
      maxMediaAssets: 1,
    },
  });

  it('normalizes crawl output and computes a content hash', () => {
    const result = new CrawlResultNormalizer().normalize(
      command,
      { key: 'http-fetch', version: '1.0.0' },
      {
        status: 'succeeded',
        finalUrl: 'https://example.com/final',
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
        },
        title: 'Example page',
        rawHtml: '<html>Hello</html>',
        outgoingLinks: [
          {
            href: '/a',
            resolvedUrl: 'https://example.com/a',
          },
          {
            href: '/b',
            resolvedUrl: 'https://example.com/b',
          },
        ],
        mediaAssets: [
          {
            resolvedUrl: 'https://example.com/image.png',
            elementType: 'img',
          },
          {
            resolvedUrl: 'https://example.com/second.png',
            elementType: 'img',
          },
        ],
        timing: { totalMs: 42 },
      },
    );

    expect(result).toMatchObject({
      attemptId: 'attempt-1',
      frontierEntryId: 'frontier-1',
      status: 'succeeded',
      finalUrl: 'https://example.com/final',
      adapter: {
        key: 'http-fetch',
        version: '1.0.0',
      },
    });
    expect(result.contentHash).toHaveLength(64);
    expect(result.headers).toEqual({ 'content-type': 'text/html' });
    expect(result.outgoingLinks).toHaveLength(1);
    expect(result.mediaAssets).toHaveLength(1);
  });

  it('bounds redirect chains and rejects oversized link metadata', () => {
    const normalizer = new CrawlResultNormalizer();
    const result = normalizer.normalize(
      command,
      { key: 'http-fetch', version: '1.0.0' },
      {
        status: 'succeeded',
        redirectChain: [
          {
            fromUrl: 'https://example.com/a',
            toUrl: 'https://example.com/b',
            statusCode: 301,
          },
          {
            fromUrl: 'https://example.com/b',
            toUrl: 'https://example.com/c',
            statusCode: 302,
          },
          {
            fromUrl: 'https://example.com/c',
            toUrl: 'https://example.com/d',
            statusCode: 302,
          },
          {
            fromUrl: 'https://example.com/d',
            toUrl: 'https://example.com/e',
            statusCode: 302,
          },
          {
            fromUrl: 'https://example.com/e',
            toUrl: 'https://example.com/f',
            statusCode: 302,
          },
          {
            fromUrl: 'https://example.com/f',
            toUrl: 'https://example.com/g',
            statusCode: 302,
          },
        ],
        timing: { totalMs: 42 },
      },
    );

    expect(result.redirectChain).toHaveLength(command.policy.maxRedirects);

    expect(() =>
      normalizer.normalize(command, { key: 'http-fetch', version: '1.0.0' }, {
        status: 'succeeded',
        outgoingLinks: [
          {
            href: '/a',
            resolvedUrl: 'https://example.com/a',
            metadata: {
              oversized: 'x'.repeat(6000),
            },
          },
        ],
        timing: { totalMs: 42 },
      }),
    ).toThrow(CrawlerValidationError);
  });

  it('rejects unsafe normalized result URLs', () => {
    expect(() =>
      new CrawlResultNormalizer().normalize(
        command,
        { key: 'http-fetch', version: '1.0.0' },
        {
          status: 'succeeded',
          finalUrl: 'data:text/html,hello',
          timing: { totalMs: 1 },
        },
      ),
    ).toThrow(CrawlerValidationError);
  });
});
