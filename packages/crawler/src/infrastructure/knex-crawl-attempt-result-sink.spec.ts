import {
  KnexCrawlAttemptResultSink,
  toCrawlAttemptRow,
} from './knex-crawl-attempt-result-sink';
import { NormalizedCrawlResult } from '../domain/crawler-types';

describe('KnexCrawlAttemptResultSink', () => {
  it('maps normalized crawl results to crawl_attempts rows', () => {
    const recordedAt = new Date('2026-07-04T00:00:00Z');

    expect(toCrawlAttemptRow(normalizedResult(), recordedAt)).toMatchObject({
      attempt_id: 'attempt-1',
      frontier_entry_id: 'frontier-1',
      topic_id: 'topic-1',
      topic_configuration_version: 1,
      requested_url: 'https://example.com/page',
      status: 'succeeded',
      final_url: 'https://example.com/page',
      status_code: 200,
      headers: {
        'content-type': 'text/html',
      },
      redirect_chain: [],
      canonical_url: 'https://example.com/page',
      title: 'Example',
      content_hash: 'hash',
      outgoing_links: [],
      media_assets: [],
      adapter_key: 'http-fetch',
      adapter_version: '1.0.0',
      failure: null,
      recorded_at: recordedAt,
      updated_at: recordedAt,
    });
  });

  it('upserts by attempt_id so BullMQ retries do not duplicate attempts', async () => {
    const merge = jest.fn();
    const onConflict = jest.fn(() => ({ merge }));
    const insert = jest.fn(() => ({ onConflict }));
    const table = jest.fn(() => ({ insert }));
    const sink = new KnexCrawlAttemptResultSink({
      knex: table,
    } as never);

    await sink.append(normalizedResult());

    expect(table).toHaveBeenCalledWith('crawl_attempts');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        attempt_id: 'attempt-1',
      }),
    );
    expect(onConflict).toHaveBeenCalledWith('attempt_id');
    expect(merge).toHaveBeenCalledWith(
      expect.not.objectContaining({
        recorded_at: expect.any(Date),
      }),
    );
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
