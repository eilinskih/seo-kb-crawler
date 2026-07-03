import { InMemoryCrawlResultSink } from './in-memory-crawl-result-sink';
import { NormalizedCrawlResult } from '../domain/crawler-types';

describe('InMemoryCrawlResultSink', () => {
  it('stores immutable snapshots of appended crawl results', async () => {
    const sink = new InMemoryCrawlResultSink();
    const result = normalizedResult();

    await sink.append(result);
    result.headers['content-type'] = 'changed';

    expect(sink.snapshot()).toEqual([
      expect.objectContaining({
        attemptId: 'attempt-1',
        headers: {
          'content-type': 'text/html',
        },
      }),
    ]);
  });
});

function normalizedResult(): NormalizedCrawlResult {
  return {
    attemptId: 'attempt-1',
    frontierEntryId: 'frontier-1',
    topicId: 'topic-1',
    topicConfigurationVersion: 1,
    requestedUrl: 'https://example.com/page',
    status: 'succeeded',
    finalUrl: 'https://example.com/page',
    statusCode: 200,
    headers: {
      'content-type': 'text/html',
    },
    redirectChain: [],
    canonicalUrl: undefined,
    title: 'Example',
    metaDescription: undefined,
    rawHtml: '<html><title>Example</title></html>',
    cleanedMarkdown: undefined,
    plainText: undefined,
    contentHash: 'hash',
    outgoingLinks: [],
    mediaAssets: [],
    timing: {
      totalMs: 1,
    },
    adapter: {
      key: 'http-fetch',
      version: '1.0.0',
    },
    failure: null,
  };
}
