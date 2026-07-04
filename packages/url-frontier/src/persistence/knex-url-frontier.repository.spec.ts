import {
  KnexUrlFrontierRepository,
  toEntryRow,
  toLease,
} from './knex-url-frontier.repository';
import { UrlFrontierEntrySeed } from '../domain/url-frontier-types';

describe('KnexUrlFrontierRepository mapping', () => {
  it('maps accepted seeds to scheduled frontier rows', () => {
    const now = new Date('2026-07-04T00:00:00Z');
    const nextCrawlAt = new Date('2026-07-04T00:05:00Z');

    expect(toEntryRow(seed(now, nextCrawlAt))).toMatchObject({
      id: '00000000-0000-4000-8000-000000000002',
      topic_id: '00000000-0000-4000-8000-000000000001',
      topic_configuration_version: 2,
      normalized_url: 'https://example.com/docs',
      normalized_url_hash: 'hash',
      crawl_policy_fingerprint: 'policy-fingerprint',
      priority_score: 0.75,
      relevance_score: 0.9,
      relevance_decision: 'accepted',
      crawl_status: 'scheduled',
      next_crawl_at: nextCrawlAt,
      lease_owner: null,
      lease_expires_at: null,
      active_attempt_id: null,
      consecutive_failures: 0,
      created_at: now,
      updated_at: now,
    });
  });

  it('builds crawl commands with deadlines bounded by lease expiry and policy timeout', () => {
    const now = new Date('2026-07-04T00:00:00Z');
    const leaseExpiresAt = new Date('2026-07-04T00:05:00Z');
    const row = toEntryRow(seed(now, now));

    const lease = toLease(
      row,
      'attempt-1',
      'worker-1',
      now,
      leaseExpiresAt,
    );

    expect(lease).toMatchObject({
      entryId: '00000000-0000-4000-8000-000000000002',
      attemptId: 'attempt-1',
      leaseOwner: 'worker-1',
      leaseExpiresAt,
      command: {
        attemptId: 'attempt-1',
        frontierEntryId: '00000000-0000-4000-8000-000000000002',
        topicId: '00000000-0000-4000-8000-000000000001',
        topicConfigurationVersion: 2,
        normalizedUrl: 'https://example.com/docs',
        crawlPolicyFingerprint: 'policy-fingerprint',
        leaseExpiresAt,
        deadline: new Date('2026-07-04T00:00:30Z'),
      },
    });
  });

  it('rejects non-positive lease durations', async () => {
    const repository = new KnexUrlFrontierRepository({} as never);

    await expect(
      repository.leaseNext({
        leaseOwner: 'worker-1',
        leaseDurationMs: 0,
        now: new Date('2026-07-04T00:00:00Z'),
      }),
    ).rejects.toThrow('leaseDurationMs must be a positive integer');
  });
});

function seed(now: Date, nextCrawlAt: Date): UrlFrontierEntrySeed {
  return {
    id: '00000000-0000-4000-8000-000000000002',
    topicId: '00000000-0000-4000-8000-000000000001',
    topicConfigurationVersion: 2,
    normalizedUrl: 'https://example.com/docs',
    normalizedUrlHash: 'hash',
    crawlPolicyFingerprint: 'policy-fingerprint',
    crawlPolicy: {
      userAgent: 'seo-kb-crawler',
      respectRobots: true,
      maxBodyBytes: 500_000,
      maxRedirects: 5,
      timeoutMs: 30_000,
      maxOutgoingLinks: 100,
      maxMediaAssets: 25,
    },
    priorityScore: 0.75,
    relevanceScore: 0.9,
    relevanceDecision: 'accepted',
    relevanceExplanation: {
      reason: 'seeded',
    },
    relevanceProfileVersion: 1,
    nextCrawlAt,
    now,
  };
}
