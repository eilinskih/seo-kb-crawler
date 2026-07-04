import { KnexCrawlAttemptResultSink } from './knex-crawl-attempt-result-sink';
import { NormalizedCrawlResult } from '../domain/crawler-types';

describe('KnexCrawlAttemptResultSink', () => {
  it('delegates crawl result completion to the URL Frontier boundary', async () => {
    const complete = jest.fn();
    const sink = new KnexCrawlAttemptResultSink({
      complete,
    } as never);
    const result = normalizedResult();

    await sink.append(result);

    expect(complete).toHaveBeenCalledWith(result);
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
    canonicalUrl: 'https://example.com/page',
    title: 'Example',
    metaDescription: 'Description',
    rawHtml: '<html><title>Example</title></html>',
    cleanedMarkdown: undefined,
    plainText: 'Example',
    contentHash: 'hash',
    outgoingLinks: [],
    mediaAssets: [],
    timing: {
      totalMs: 10,
    },
    adapter: {
      key: 'http-fetch',
      version: '1.0.0',
    },
    failure: null,
  };
}
