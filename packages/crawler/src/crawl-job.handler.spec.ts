import { CrawlJobHandler } from './crawl-job.handler';
import { CrawlExecutionWrapper } from './crawl-execution-wrapper';
import { CrawlerAdapterSelector } from './domain/crawler-adapter-selector';
import { CrawlResultNormalizer } from './domain/crawl-result-normalizer';
import {
  CrawlerAdapter,
  CrawlCommandPayload,
  CrawlResultSink,
  NormalizedCrawlResult,
} from './domain/crawler-types';

describe('CrawlJobHandler', () => {
  it('returns a terminal adapter error when no compatible adapter is configured', async () => {
    const dispose = jest.fn();
    const resultSink = recordingSink();
    const result = await new CrawlJobHandler(
      new CrawlResultNormalizer(),
      {
        prepare: jest.fn(async () => ({
          status: 'ready',
          context: {},
          dispose,
        })),
      } as unknown as CrawlExecutionWrapper,
      new CrawlerAdapterSelector(),
      [],
      resultSink,
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
      detail: 'No compatible crawler adapter is configured',
      retryable: false,
    });
    expect(resultSink.append).toHaveBeenCalledWith(result);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('runs the selected adapter with the prepared execution context', async () => {
    const context = {
      command: {},
    };
    const dispose = jest.fn();
    const adapter: CrawlerAdapter = {
      key: 'http-fetch',
      version: '1.0.0',
      capabilities: {
        supportsJavaScriptRendering: false,
        supportsMarkdownExtraction: false,
        supportsPlainTextExtraction: true,
        supportsScreenshot: false,
        supportsNetworkIdle: false,
        supportsRobotsAwareFetch: true,
        maximumBodyBytes: 500_000,
        maximumExecutionMs: 30_000,
      },
      crawl: jest.fn(async () => ({
        status: 'succeeded' as const,
        finalUrl: 'https://example.com/page',
        statusCode: 200,
        headers: {
          'content-type': 'text/html',
        },
        rawHtml: '<html><title>Example</title></html>',
        timing: { totalMs: 12 },
      })),
    };
    const resultSink = recordingSink();

    const result = await new CrawlJobHandler(
      new CrawlResultNormalizer(),
      {
        prepare: jest.fn(async () => ({
          status: 'ready',
          context,
          dispose,
        })),
      } as unknown as CrawlExecutionWrapper,
      new CrawlerAdapterSelector(),
      [adapter],
      resultSink,
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
        requiresPlainText: true,
        maxBodyBytes: 500_000,
        maxRedirects: 5,
        timeoutMs: 30_000,
        maxOutgoingLinks: 100,
        maxMediaAssets: 25,
      },
    });

    expect(adapter.crawl).toHaveBeenCalledWith(context);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(resultSink.append).toHaveBeenCalledWith(result);
    expect(result).toMatchObject({
      status: 'succeeded',
      adapter: {
        key: 'http-fetch',
        version: '1.0.0',
      },
      title: undefined,
    });
  });

  it('returns policy preparation failures before adapter-disabled results', async () => {
    const resultSink = recordingSink();
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
      new CrawlerAdapterSelector(),
      [],
      resultSink,
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
    expect(resultSink.append).toHaveBeenCalledWith(result);
  });

  it('propagates result sink failures so BullMQ can retry or fail the job', async () => {
    const sinkError = new Error('sink unavailable');
    const resultSink: CrawlResultSink = {
      append: jest.fn(async () => {
        throw sinkError;
      }),
    };

    await expect(
      new CrawlJobHandler(
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
        new CrawlerAdapterSelector(),
        [],
        resultSink,
      ).handle(commandPayload()),
    ).rejects.toThrow(sinkError);
  });
});

function recordingSink(): CrawlResultSink & {
  append: jest.Mock<Promise<void>, [NormalizedCrawlResult]>;
} {
  return {
    append: jest.fn(async (_result: NormalizedCrawlResult) => undefined),
  };
}

function commandPayload(): CrawlCommandPayload {
  return {
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
  };
}
