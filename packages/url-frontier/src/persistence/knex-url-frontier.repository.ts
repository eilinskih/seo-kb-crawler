import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  UrlFrontierCrawlPolicySnapshot,
  UrlFrontierCrawlStatus,
  UrlFrontierEntrySeed,
  UrlFrontierLease,
  UrlFrontierLeaseOptions,
  UrlFrontierRelevanceDecision,
  UrlFrontierRepository,
  UrlFrontierStatusSummary,
} from '../domain/url-frontier-types';

export interface UrlFrontierEntryRow {
  id: string;
  topic_id: string;
  topic_configuration_version: number;
  normalized_url: string;
  normalized_url_hash: string;
  crawl_policy_fingerprint: string;
  crawl_policy: UrlFrontierCrawlPolicySnapshot;
  priority_score: number;
  relevance_score: number | null;
  relevance_decision: UrlFrontierRelevanceDecision;
  relevance_explanation: Record<string, unknown> | null;
  relevance_profile_version: number | null;
  crawl_status: UrlFrontierCrawlStatus;
  next_crawl_at: Date | string;
  lease_owner: string | null;
  lease_expires_at: Date | string | null;
  active_attempt_id: string | null;
  last_crawled_at: Date | string | null;
  consecutive_failures: number;
  created_at: Date | string;
  updated_at: Date | string;
}

@Injectable()
export class KnexUrlFrontierRepository implements UrlFrontierRepository {
  constructor(private readonly db: DbService) {}

  async upsertEntry(seed: UrlFrontierEntrySeed): Promise<void> {
    const row = toEntryRow(seed);
    await this.db
      .knex<UrlFrontierEntryRow>('url_frontier_entries')
      .insert(row)
      .onConflict(['topic_id', 'normalized_url_hash'])
      .merge({
        topic_configuration_version: row.topic_configuration_version,
        normalized_url: row.normalized_url,
        crawl_policy_fingerprint: row.crawl_policy_fingerprint,
        crawl_policy: row.crawl_policy,
        priority_score: row.priority_score,
        relevance_score: row.relevance_score,
        relevance_decision: row.relevance_decision,
        relevance_explanation: row.relevance_explanation,
        relevance_profile_version: row.relevance_profile_version,
        next_crawl_at: row.next_crawl_at,
        updated_at: row.updated_at,
      });
  }

  async leaseNext(
    options: UrlFrontierLeaseOptions,
  ): Promise<UrlFrontierLease | null> {
    if (
      !Number.isInteger(options.leaseDurationMs) ||
      options.leaseDurationMs < 1
    ) {
      throw new Error('leaseDurationMs must be a positive integer');
    }

    const leaseExpiresAt = new Date(
      options.now.getTime() + options.leaseDurationMs,
    );

    return this.db.knex.transaction(async (transaction) => {
      const entry = await transaction<UrlFrontierEntryRow>(
        'url_frontier_entries',
      )
        .where((builder) => {
          builder
            .whereIn('crawl_status', ['idle', 'scheduled', 'succeeded'])
            .orWhere('crawl_status', 'failed_retryable')
            .orWhere((expiredLease) => {
              expiredLease
                .whereIn('crawl_status', ['leased', 'crawling'])
                .andWhere('lease_expires_at', '<=', options.now);
            });
        })
        .whereIn('relevance_decision', ['accepted', 'insufficient_evidence'])
        .andWhere('next_crawl_at', '<=', options.now)
        .orderBy('next_crawl_at', 'asc')
        .orderBy('priority_score', 'desc')
        .orderByRaw('last_crawled_at ASC NULLS FIRST')
        .orderBy('id', 'asc')
        .forUpdate()
        .skipLocked()
        .first();

      if (!entry) {
        return null;
      }

      const attemptId = randomUUID();
      const updated = await transaction<UrlFrontierEntryRow>(
        'url_frontier_entries',
      )
        .where({
          id: entry.id,
          crawl_status: entry.crawl_status,
        })
        .update({
          crawl_status: 'leased',
          lease_owner: options.leaseOwner,
          lease_expires_at: leaseExpiresAt,
          active_attempt_id: attemptId,
          updated_at: options.now,
        });

      if (updated !== 1) {
        return null;
      }

      return toLease(
        entry,
        attemptId,
        options.leaseOwner,
        options.now,
        leaseExpiresAt,
      );
    });
  }

  async acknowledgeCrawling(attemptId: string, now: Date): Promise<boolean> {
    const updated = await this.db
      .knex<UrlFrontierEntryRow>('url_frontier_entries')
      .where({
        active_attempt_id: attemptId,
        crawl_status: 'leased',
      })
      .andWhere('lease_expires_at', '>', now)
      .update({
        crawl_status: 'crawling',
        updated_at: now,
      });

    return updated === 1;
  }

  async summarizeStatus(topicId?: string): Promise<UrlFrontierStatusSummary> {
    const base = this.db.knex<UrlFrontierEntryRow>('url_frontier_entries');
    const filtered = topicId ? base.clone().where('topic_id', topicId) : base.clone();

    const countRows = await filtered
      .clone()
      .select('crawl_status')
      .count({ count: '*' })
      .groupBy('crawl_status') as Array<{
        crawl_status: UrlFrontierCrawlStatus;
        count: string | number;
      }>;
    const recentRows = await filtered
      .clone()
      .orderBy('updated_at', 'desc')
      .orderBy('id', 'asc')
      .limit(25);
    const counts = countRows.map((row) => ({
      status: row.crawl_status,
      count: Number(row.count),
    }));

    return {
      topicId: topicId ?? null,
      totalEntries: counts.reduce((total, row) => total + row.count, 0),
      counts,
      retryableCount: counts.find((row) => row.status === 'failed_retryable')?.count ?? 0,
      recentEntries: recentRows.map((row) => ({
        id: row.id,
        topicId: row.topic_id,
        normalizedUrl: row.normalized_url,
        crawlStatus: row.crawl_status,
        relevanceDecision: row.relevance_decision,
        priorityScore: row.priority_score,
        nextCrawlAt: toIsoString(row.next_crawl_at),
        leaseOwner: row.lease_owner,
        consecutiveFailures: row.consecutive_failures,
        updatedAt: toIsoString(row.updated_at),
      })),
    };
  }
}

export function toLease(
  entry: UrlFrontierEntryRow,
  attemptId: string,
  leaseOwner: string,
  now: Date,
  leaseExpiresAt: Date,
): UrlFrontierLease {
  return {
    entryId: entry.id,
    attemptId,
    leaseOwner,
    leaseExpiresAt,
    command: {
      attemptId,
      frontierEntryId: entry.id,
      topicId: entry.topic_id,
      topicConfigurationVersion: entry.topic_configuration_version,
      normalizedUrl: entry.normalized_url,
      crawlPolicyFingerprint: entry.crawl_policy_fingerprint,
      leaseExpiresAt,
      deadline: commandDeadline(now, leaseExpiresAt, entry.crawl_policy),
      policy: entry.crawl_policy,
    },
  };
}

export function toEntryRow(seed: UrlFrontierEntrySeed): UrlFrontierEntryRow {
  return {
    id: seed.id,
    topic_id: seed.topicId,
    topic_configuration_version: seed.topicConfigurationVersion,
    normalized_url: seed.normalizedUrl,
    normalized_url_hash: seed.normalizedUrlHash,
    crawl_policy_fingerprint: seed.crawlPolicyFingerprint,
    crawl_policy: seed.crawlPolicy,
    priority_score: seed.priorityScore,
    relevance_score: seed.relevanceScore ?? null,
    relevance_decision: seed.relevanceDecision,
    relevance_explanation: seed.relevanceExplanation ?? null,
    relevance_profile_version: seed.relevanceProfileVersion ?? null,
    crawl_status: 'scheduled',
    next_crawl_at: seed.nextCrawlAt,
    lease_owner: null,
    lease_expires_at: null,
    active_attempt_id: null,
    last_crawled_at: null,
    consecutive_failures: 0,
    created_at: seed.now,
    updated_at: seed.now,
  };
}

function commandDeadline(
  now: Date,
  leaseExpiresAt: Date,
  policy: UrlFrontierCrawlPolicySnapshot,
): Date {
  return new Date(
    Math.min(leaseExpiresAt.getTime(), now.getTime() + policy.timeoutMs),
  );
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
