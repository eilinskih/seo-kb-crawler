import { createCrawlCommand } from './crawl-command';
import { CrawlerAdapterSelectionError } from './crawler-errors';
import { CrawlerAdapterSelector } from './crawler-adapter-selector';
import { CrawlerAdapter } from './crawler-types';

const httpAdapter: CrawlerAdapter = {
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
    maximumExecutionMs: 20_000,
  },
  crawl: jest.fn(),
};

const crawl4aiAdapter: CrawlerAdapter = {
  key: 'crawl4ai',
  version: '1.0.0',
  capabilities: {
    supportsJavaScriptRendering: true,
    supportsMarkdownExtraction: true,
    supportsPlainTextExtraction: true,
    supportsScreenshot: false,
    supportsNetworkIdle: true,
    supportsRobotsAwareFetch: true,
    maximumBodyBytes: 2_000_000,
    maximumExecutionMs: 60_000,
  },
  crawl: jest.fn(),
};

describe('CrawlerAdapterSelector', () => {
  it('selects the first deployment-ordered compatible adapter', () => {
    const command = createCommand({
      requiresMarkdown: true,
    });

    const selected = new CrawlerAdapterSelector().select(command, [
      crawl4aiAdapter,
      httpAdapter,
    ]);

    expect(selected.key).toBe('crawl4ai');
  });

  it('rejects incompatible adapter and policy combinations', () => {
    const command = createCommand({
      requiresJavaScript: true,
      timeoutMs: 30_000,
    });

    expect(() =>
      new CrawlerAdapterSelector().select(command, [httpAdapter]),
    ).toThrow(CrawlerAdapterSelectionError);
  });
});

function createCommand(
  policy: Partial<Parameters<typeof createCrawlCommand>[0]['policy']>,
) {
  return createCrawlCommand({
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
      timeoutMs: 20_000,
      maxOutgoingLinks: 100,
      maxMediaAssets: 25,
      ...policy,
    },
  });
}
