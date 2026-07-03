import { CrawlJobHandler } from './crawl-job.handler';
import { CrawlResultNormalizer } from './domain/crawl-result-normalizer';

describe('CrawlJobHandler', () => {
  it('returns a terminal adapter error until crawler adapters are configured', async () => {
    const result = await new CrawlJobHandler(
      new CrawlResultNormalizer(),
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
});
