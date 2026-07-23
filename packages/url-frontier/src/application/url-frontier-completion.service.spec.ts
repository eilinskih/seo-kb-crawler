import {
  retryDelayMs,
  retryPolicyFromCrawlPolicy,
  successRecrawlDelayMs,
  toCrawlAttemptRow,
  toFrontierCompletionUpdate,
  UrlFrontierCompletionService,
  UrlFrontierCrawlResult,
} from './url-frontier-completion.service';

describe('UrlFrontierCompletionService', () => {
  it('maps normalized crawl results to crawl_attempts rows', () => {
    const recordedAt = new Date('2026-07-04T00:00:00Z');

    expect(toCrawlAttemptRow(crawlResult(), recordedAt)).toMatchObject({
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

  it('upserts attempts and completes the active frontier entry in one transaction', async () => {
    const merge = jest.fn();
    const onConflict = jest.fn(() => ({ merge }));
    const insert = jest.fn(() => ({ onConflict }));
    const update = jest.fn();
    const updateWhere = jest.fn(() => ({ update }));
    const first = jest.fn(async () => ({
      consecutive_failures: 0,
      crawl_policy: {
        recrawlIntervalHours: 48,
        minRecrawlIntervalHours: 24,
        maxRecrawlIntervalHours: 720,
      },
    }));
    const selectWhere = jest.fn(() => ({ first }));
    const select = jest.fn(() => ({ where: selectWhere }));
    const transactionTable = Object.assign(
      jest.fn((tableName: string) =>
        tableName === 'crawl_attempts'
          ? { insert }
          : { select, where: updateWhere },
      ),
      {
        raw: jest.fn((sql: string) => ({ sql })),
      },
    );
    const transaction = jest.fn(async (callback: (trx: unknown) => unknown) =>
      callback(transactionTable),
    );
    const service = new UrlFrontierCompletionService({
      knex: {
        transaction,
      },
    } as never);

    await service.complete(crawlResult());

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transactionTable).toHaveBeenCalledWith('crawl_attempts');
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
    expect(select).toHaveBeenCalledWith('consecutive_failures', 'crawl_policy');
    expect(selectWhere).toHaveBeenCalledWith({
      id: 'frontier-1',
      active_attempt_id: 'attempt-1',
    });
    expect(transactionTable).toHaveBeenCalledWith('url_frontier_entries');
    expect(updateWhere).toHaveBeenCalledWith({
      id: 'frontier-1',
      active_attempt_id: 'attempt-1',
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        crawl_status: 'succeeded',
        active_attempt_id: null,
        lease_owner: null,
        lease_expires_at: null,
        next_crawl_at: expect.any(Date),
        consecutive_failures: 0,
      }),
    );
  });

  it('maps successful crawl results to scheduled recrawl completion', () => {
    const completedAt = new Date('2026-07-04T00:00:00Z');

    expect(
      toFrontierCompletionUpdate(crawlResult(), completedAt, 3, {
        recrawlIntervalHours: 48,
        minRecrawlIntervalHours: 24,
        maxRecrawlIntervalHours: 720,
      }),
    ).toMatchObject({
      crawl_status: 'succeeded',
      active_attempt_id: null,
      lease_owner: null,
      lease_expires_at: null,
      last_crawled_at: completedAt,
      next_crawl_at: new Date('2026-07-06T00:00:00Z'),
      consecutive_failures: 0,
      incrementConsecutiveFailures: false,
      updated_at: completedAt,
    });
  });

  it('maps retryable crawl results to retryable frontier completion', () => {
    const completedAt = new Date('2026-07-04T00:00:00Z');
    const nextCrawlAt = new Date('2026-07-04T00:05:00Z');

    expect(
      toFrontierCompletionUpdate(
        {
          ...crawlResult(),
          status: 'timed_out',
          failure: {
            category: 'network_timeout',
            detail: 'deadline expired',
            retryable: true,
          },
        },
        completedAt,
      ),
    ).toEqual({
      crawl_status: 'failed_retryable',
      active_attempt_id: null,
      lease_owner: null,
      lease_expires_at: null,
      next_crawl_at: nextCrawlAt,
      incrementConsecutiveFailures: true,
      updated_at: completedAt,
    });
  });

  it('caps retry backoff and terminally fails exhausted retry budgets', () => {
    const completedAt = new Date('2026-07-04T00:00:00Z');
    const retryableResult: UrlFrontierCrawlResult = {
      ...crawlResult(),
      status: 'failed_retryable',
      failure: {
        category: 'connection_failure',
        detail: 'connection reset',
        retryable: true,
      },
    };

    expect(
      toFrontierCompletionUpdate(
        retryableResult,
        completedAt,
        2,
        undefined,
        {
          baseBackoffMs: 100,
          maxBackoffMs: 250,
          maxRetryableFailures: 5,
          jitterRatio: 0,
        },
      ),
    ).toMatchObject({
      crawl_status: 'failed_retryable',
      next_crawl_at: new Date('2026-07-04T00:00:00.250Z'),
      incrementConsecutiveFailures: true,
    });

    expect(
      toFrontierCompletionUpdate(
        retryableResult,
        completedAt,
        4,
        undefined,
        {
          baseBackoffMs: 100,
          maxBackoffMs: 250,
          maxRetryableFailures: 5,
          jitterRatio: 0,
        },
      ),
    ).toMatchObject({
      crawl_status: 'failed_terminal',
      consecutive_failures: 5,
      incrementConsecutiveFailures: false,
    });
  });

  it('computes bounded exponential retry delay', () => {
    expect(
      retryDelayMs(3, {
        baseBackoffMs: 100,
        maxBackoffMs: 500,
        maxRetryableFailures: 5,
        jitterRatio: 0,
      }),
    ).toBe(500);
  });

  it('derives bounded retry policy from crawl policy and applies jitter', () => {
    const retryPolicy = retryPolicyFromCrawlPolicy({
      userAgent: 'seo-kb-crawler',
      respectRobots: true,
      maxBodyBytes: 1000,
      maxRedirects: 5,
      timeoutMs: 30000,
      maxOutgoingLinks: 100,
      maxMediaAssets: 25,
      retryBaseBackoffMs: 100,
      retryMaxBackoffMs: 1000,
      retryMaxFailures: 3,
      retryJitterRatio: 0.5,
    });

    expect(retryPolicy).toEqual({
      baseBackoffMs: 100,
      maxBackoffMs: 1000,
      maxRetryableFailures: 3,
      jitterRatio: 0.5,
    });
    expect(retryDelayMs(1, retryPolicy, 'attempt-1')).toBeGreaterThanOrEqual(200);
    expect(retryDelayMs(1, retryPolicy, 'attempt-1')).toBeLessThanOrEqual(300);
  });

  it('computes bounded success recrawl delay from crawl policy', () => {
    expect(
      successRecrawlDelayMs({
        recrawlIntervalHours: 2,
        minRecrawlIntervalHours: 12,
        maxRecrawlIntervalHours: 48,
      }),
    ).toBe(12 * 60 * 60 * 1000);

    expect(
      successRecrawlDelayMs({
        recrawlIntervalHours: 100,
        minRecrawlIntervalHours: 12,
        maxRecrawlIntervalHours: 48,
      }),
    ).toBe(48 * 60 * 60 * 1000);
  });

  it('maps terminal crawl results to terminal frontier completion', () => {
    const completedAt = new Date('2026-07-04T00:00:00Z');

    expect(
      toFrontierCompletionUpdate(
        {
          ...crawlResult(),
          status: 'blocked_by_policy',
          failure: {
            category: 'robots_denied',
            detail: 'robots denied',
            retryable: false,
          },
        },
        completedAt,
      ),
    ).toMatchObject({
      crawl_status: 'failed_terminal',
      active_attempt_id: null,
      lease_owner: null,
      lease_expires_at: null,
      incrementConsecutiveFailures: false,
      updated_at: completedAt,
    });
  });
});

function crawlResult(): UrlFrontierCrawlResult {
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
