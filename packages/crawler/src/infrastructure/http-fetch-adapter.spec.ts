import { HttpFetchAdapter } from './http-fetch-adapter';
import { SafeNetworkError } from '../domain/crawler-errors';
import { CrawlExecutionContext, SafeNetworkGateway } from '../domain/crawler-types';

describe('HttpFetchAdapter', () => {
  const command = {
    attemptId: 'attempt-1',
    frontierEntryId: 'frontier-1',
    topicId: 'topic-1',
    topicConfigurationVersion: 1,
    normalizedUrl: 'https://example.com/docs/page',
    crawlPolicyFingerprint: 'policy-1',
    leaseExpiresAt: new Date('2026-07-03T10:01:00Z'),
    deadline: new Date('2026-07-03T10:00:30Z'),
    policy: {
      userAgent: 'seo-kb-crawler',
      respectRobots: true,
      allowedHosts: ['example.com'],
      includedPathPatterns: ['/docs/*'],
      crossHostCanonicalPolicy: 'same-host' as const,
      maxBodyBytes: 500_000,
      maxRedirects: 5,
      timeoutMs: 30_000,
      maxOutgoingLinks: 2,
      maxMediaAssets: 25,
    },
  };

  it('fetches static HTML through the safe network gateway and extracts basics', async () => {
    const body = new TextEncoder().encode(`
      <html>
        <head>
          <title> Example &amp; Docs </title>
          <meta name="description" content="Short description">
          <link rel="canonical" href="/docs/page">
        </head>
        <body>
          <a href="/docs/next" rel="nofollow">Next page</a>
          <a href="mailto:test@example.com">Email</a>
          <a href="https://example.com/docs/second">Second page</a>
          <a href="https://example.com/docs/third">Third page</a>
        </body>
      </html>
    `);
    const safeNetworkGateway: SafeNetworkGateway = {
      fetch: jest.fn(async () => ({
        finalUrl: 'https://example.com/docs/page',
        statusCode: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
        },
        body,
        redirectChain: [],
      })),
    };

    const result = await new HttpFetchAdapter().crawl(
      executionContext(safeNetworkGateway),
    );

    expect(safeNetworkGateway.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://example.com/docs/page',
        method: 'GET',
        maxBodyBytes: 500_000,
        maxRedirects: 5,
        headers: expect.objectContaining({
          'user-agent': 'seo-kb-crawler',
        }),
      }),
    );
    expect(result).toMatchObject({
      status: 'succeeded',
      finalUrl: 'https://example.com/docs/page',
      statusCode: 200,
      canonicalUrl: 'https://example.com/docs/page',
      title: 'Example & Docs',
      metaDescription: 'Short description',
      plainText: expect.stringContaining('Next page'),
      outgoingLinks: [
        {
          href: '/docs/next',
          resolvedUrl: 'https://example.com/docs/next',
          anchorText: 'Next page',
          rel: ['nofollow'],
        },
        {
          href: 'https://example.com/docs/second',
          resolvedUrl: 'https://example.com/docs/second',
          anchorText: 'Second page',
        },
      ],
    });
  });

  it('blocks redirects that leave Topic policy boundaries', async () => {
    const safeNetworkGateway: SafeNetworkGateway = {
      fetch: jest.fn(async () => ({
        finalUrl: 'https://other.example/docs/page',
        statusCode: 200,
        headers: {
          'content-type': 'text/html',
        },
        body: new TextEncoder().encode('<html><body>Moved</body></html>'),
        redirectChain: [
          {
            fromUrl: 'https://example.com/docs/page',
            toUrl: 'https://other.example/docs/page',
            statusCode: 302,
          },
        ],
      })),
    };

    const result = await new HttpFetchAdapter().crawl(
      executionContext(safeNetworkGateway),
    );

    expect(result).toMatchObject({
      status: 'blocked_by_policy',
      finalUrl: 'https://other.example/docs/page',
      failure: {
        category: 'policy_redirect_blocked',
        retryable: false,
      },
    });
  });

  it('returns terminal failure for non-HTML responses', async () => {
    const safeNetworkGateway: SafeNetworkGateway = {
      fetch: jest.fn(async () => ({
        finalUrl: 'https://example.com/docs/file.pdf',
        statusCode: 200,
        headers: {
          'content-type': 'application/pdf',
        },
        body: new Uint8Array([1, 2, 3]),
        redirectChain: [],
      })),
    };

    const result = await new HttpFetchAdapter().crawl(
      executionContext(safeNetworkGateway),
    );

    expect(result).toMatchObject({
      status: 'failed_terminal',
      failure: {
        category: 'unsupported_content_type',
        retryable: false,
      },
    });
  });

  it('marks throttled and server error responses as retryable', async () => {
    const safeNetworkGateway: SafeNetworkGateway = {
      fetch: jest.fn(async () => ({
        finalUrl: 'https://example.com/docs/page',
        statusCode: 429,
        headers: {
          'content-type': 'text/html',
        },
        body: new TextEncoder().encode('<html><body>Slow down</body></html>'),
        redirectChain: [],
      })),
    };

    const result = await new HttpFetchAdapter().crawl(
      executionContext(safeNetworkGateway),
    );

    expect(result).toMatchObject({
      status: 'failed_retryable',
      failure: {
        category: 'http_429',
        retryable: true,
      },
    });
  });

  it('maps safe network policy failures to crawler failures', async () => {
    const safeNetworkGateway: SafeNetworkGateway = {
      fetch: jest.fn(async () => {
        throw new SafeNetworkError('Resolved address is not publicly routable');
      }),
    };

    const result = await new HttpFetchAdapter().crawl(
      executionContext(safeNetworkGateway),
    );

    expect(result).toMatchObject({
      status: 'blocked_by_policy',
      failure: {
        category: 'unsafe_target',
        retryable: false,
      },
    });
  });

  function executionContext(
    safeNetworkGateway: SafeNetworkGateway,
  ): CrawlExecutionContext {
    return {
      command,
      robotsDecision: {
        allowed: true,
        checkedUrl: command.normalizedUrl,
        userAgent: command.policy.userAgent,
      },
      topicPolicyDecision: {
        allowed: true,
        checkedUrl: command.normalizedUrl,
        kind: 'request',
        evidence: 'allowed',
      },
      safeNetworkGateway,
      deadline: command.deadline,
      signal: new AbortController().signal,
    };
  }
});
