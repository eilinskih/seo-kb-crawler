import { CrawlJobHandler } from './crawl-job.handler';
import { CrawlExecutionWrapper } from './crawl-execution-wrapper';
import { CrawlResultNormalizer } from './domain/crawl-result-normalizer';

describe('CrawlJobHandler', () => {
  it('returns a terminal adapter error until crawler adapters are configured', async () => {
    const result = await new CrawlJobHandler(
      new CrawlResultNormalizer(),
      {
        prepare: jest.fn(async () => ({
          status: 'ready',
          context: {},
          dispose: jest.fn(),
        })),
      } as unknown as CrawlExecutionWrapper,
    ).handle({
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
        maxOutgoingLinks: 100,
        maxMediaAssets: 25,
      },
    });

    expect(result.status).toBe('failed_terminal');
    expect(result.failure).toMatchObject({
      category: 'adapter_error',
      retryable: false,
    });
  });

  it('returns policy preparation failures before adapter-disabled results', async () => {
    const result = await new CrawlJobHandler(
      new CrawlResultNormalizer(),
      {
        prepare: jest.fn(async () => ({
          status: 'blocked',
          result: {
            status: 'blocked_by_policy',
            timing: { totalMs: 0 },
            failure: {
              category: 'robots_denied',
              detail: 'disallow: /private',
              retryable: false,
            },
          },
        })),
      } as unknown as CrawlExecutionWrapper,
    ).handle({
      attemptId: 'attempt-1',
      frontierEntryId: 'frontier-1',
      topicId: 'topic-1',
      topicConfigurationVersion: 1,
      normalizedUrl: 'https://example.com/private',
      crawlPolicyFingerprint: 'policy-1',
      leaseExpiresAt: '2026-07-03T10:01:00Z',
      deadline: '2026-07-03T10:00:30Z',
      policy: {
        userAgent: 'seo-kb-crawler',
        respectRobots: true,
        maxBodyBytes: 500_000,
        maxRedirects: 5,
        timeoutMs: 30_000,
        maxOutgoingLinks: 100,
        maxMediaAssets: 25,
      },
    });

    expect(result.status).toBe('blocked_by_policy');
    expect(result.failure).toMatchObject({
      category: 'robots_denied',
      detail: 'disallow: /private',
    });
  });
});
