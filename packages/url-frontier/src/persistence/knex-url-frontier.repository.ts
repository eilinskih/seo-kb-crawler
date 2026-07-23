import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  UrlFrontierCanonicalEvidenceType,
  UrlFrontierCrawlPolicySnapshot,
  UrlFrontierCrawlStatus,
  UrlFrontierDiscoveryObservation,
  UrlFrontierDiscoveryObservationReceipt,
  UrlFrontierDiscoverySourceType,
  UrlFrontierEntrySeed,
  UrlFrontierLease,
  UrlFrontierLeaseOptions,
  UrlFrontierPendingObservation,
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
  canonical_url: string | null;
  canonical_source: UrlFrontierCanonicalEvidenceType | null;
  suppression_reason: string | null;
  last_crawled_at: Date | string | null;
  consecutive_failures: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface UrlCanonicalRelationRow {
  id: string;
  topic_id: string;
  source_frontier_entry_id: string;
  target_frontier_entry_id: string | null;
  source_normalized_url: string;
  target_normalized_url: string;
  target_normalized_url_hash: string;
  evidence_type: UrlFrontierCanonicalEvidenceType;
  evidence: Record<string, unknown>;
  accepted: boolean;
  rejection_reason: string | null;
  created_at: Date | string;
}

export interface UrlDiscoveryObservationRow {
  id: string;
  frontier_entry_id: string | null;
  topic_id: string;
  topic_configuration_version: number;
  discovery_run_id: string;
  source_type: UrlFrontierDiscoverySourceType;
  source_key: string;
  discovered_url: string;
  normalized_url: string;
  normalized_url_hash: string;
  discovered_at: Date | string;
  source_url: string | null;
  title: string | null;
  snippet: string | null;
  anchor_text: string | null;
  source_rank: number | null;
  metadata: Record<string, unknown>;
  idempotency_key: string;
  created_at: Date | string;
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

  async appendDiscoveryObservations(
    observations: UrlFrontierDiscoveryObservation[],
  ): Promise<UrlFrontierDiscoveryObservationReceipt[]> {
    const receipts: UrlFrontierDiscoveryObservationReceipt[] = [];

    for (const observation of observations) {
      const rowInput = toObservationRowInput(observation);
      if (!rowInput) {
        receipts.push({
          idempotencyKey: observation.idempotencyKey,
          status: 'malformed',
          frontierEntryId: null,
        });
        continue;
      }

      const existing = await this.db.knex<UrlDiscoveryObservationRow>(
        'url_discovery_observations',
      )
        .where('idempotency_key', observation.idempotencyKey)
        .first();
      if (existing) {
        receipts.push({
          idempotencyKey: observation.idempotencyKey,
          status: 'duplicate',
          frontierEntryId: existing.frontier_entry_id,
        });
        continue;
      }

      const entry = await this.db.knex<UrlFrontierEntryRow>(
        'url_frontier_entries',
      )
        .where({
          topic_id: observation.topicId,
          normalized_url_hash: rowInput.normalized_url_hash,
        })
        .first();
      const row: UrlDiscoveryObservationRow = {
        ...rowInput,
        id: randomUUID(),
        frontier_entry_id: entry?.id ?? null,
      };

      await this.db.knex<UrlDiscoveryObservationRow>(
        'url_discovery_observations',
      ).insert(row);

      receipts.push({
        idempotencyKey: observation.idempotencyKey,
        status: 'accepted',
        frontierEntryId: row.frontier_entry_id,
      });
    }

    return receipts;
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

  async listPendingDiscoveryObservations(
    limit: number,
  ): Promise<UrlFrontierPendingObservation[]> {
    const rows = await this.db.knex<UrlDiscoveryObservationRow>(
      'url_discovery_observations',
    )
      .whereNull('frontier_entry_id')
      .orderBy('discovered_at', 'asc')
      .orderBy('id', 'asc')
      .limit(limit);

    return rows.map(toPendingObservation);
  }

  async linkDiscoveryObservation(
    observationId: string,
    frontierEntryId: string,
  ): Promise<boolean> {
    const updated = await this.db.knex<UrlDiscoveryObservationRow>(
      'url_discovery_observations',
    )
      .where({
        id: observationId,
      })
      .whereNull('frontier_entry_id')
      .update({
        frontier_entry_id: frontierEntryId,
      });

    return updated === 1;
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

  async findEntryById(entryId: string): Promise<UrlFrontierEntryRow | null> {
    const row = await this.db.knex<UrlFrontierEntryRow>(
      'url_frontier_entries',
    )
      .where('id', entryId)
      .first();
    return row ?? null;
  }

  async findEntryByTopicAndUrlHash(
    topicId: string,
    normalizedUrlHash: string,
  ): Promise<UrlFrontierEntryRow | null> {
    const row = await this.db.knex<UrlFrontierEntryRow>(
      'url_frontier_entries',
    )
      .where({
        topic_id: topicId,
        normalized_url_hash: normalizedUrlHash,
      })
      .first();
    return row ?? null;
  }

  async insertCanonicalRelation(
    row: UrlCanonicalRelationRow,
  ): Promise<void> {
    await this.db.knex<UrlCanonicalRelationRow>('url_canonical_relations')
      .insert(row)
      .onConflict([
        'source_frontier_entry_id',
        'target_normalized_url_hash',
        'evidence_type',
      ])
      .merge({
        target_frontier_entry_id: row.target_frontier_entry_id,
        target_normalized_url: row.target_normalized_url,
        evidence: row.evidence,
        accepted: row.accepted,
        rejection_reason: row.rejection_reason,
        created_at: row.created_at,
      });
  }

  async suppressCanonicalDuplicate(
    sourceEntryId: string,
    targetNormalizedUrl: string,
    canonicalSource: UrlFrontierCanonicalEvidenceType,
    now: Date,
  ): Promise<boolean> {
    const updated = await this.db.knex<UrlFrontierEntryRow>(
      'url_frontier_entries',
    )
      .where('id', sourceEntryId)
      .update({
        canonical_url: targetNormalizedUrl,
        canonical_source: canonicalSource,
        suppression_reason: 'canonical_duplicate',
        relevance_decision: 'rejected',
        relevance_score: 0,
        relevance_explanation: {
          reason: 'canonical_duplicate',
          canonicalUrl: targetNormalizedUrl,
        },
        priority_score: 0,
        updated_at: now,
      });

    return updated === 1;
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
    canonical_url: null,
    canonical_source: null,
    suppression_reason: null,
    last_crawled_at: null,
    consecutive_failures: 0,
    created_at: seed.now,
    updated_at: seed.now,
  };
}

export function toObservationRowInput(
  observation: UrlFrontierDiscoveryObservation,
): Omit<UrlDiscoveryObservationRow, 'id' | 'frontier_entry_id'> | null {
  const normalizedUrl = normalizeFrontierUrl(observation.discoveredUrl);
  if (!normalizedUrl) {
    return null;
  }

  return {
    topic_id: observation.topicId,
    topic_configuration_version: observation.topicConfigurationVersion,
    discovery_run_id: observation.discoveryRunId,
    source_type: observation.sourceType,
    source_key: observation.sourceKey,
    discovered_url: observation.discoveredUrl,
    normalized_url: normalizedUrl,
    normalized_url_hash: urlFrontierHash(normalizedUrl),
    discovered_at: observation.discoveredAt,
    source_url: observation.sourceUrl ?? null,
    title: observation.title ?? null,
    snippet: observation.snippet ?? null,
    anchor_text: observation.anchorText ?? null,
    source_rank: observation.sourceRank ?? null,
    metadata: observation.metadata,
    idempotency_key: observation.idempotencyKey,
    created_at: observation.discoveredAt,
  };
}

export function toPendingObservation(
  row: UrlDiscoveryObservationRow,
): UrlFrontierPendingObservation {
  return {
    observationId: row.id,
    topicId: row.topic_id,
    topicConfigurationVersion: row.topic_configuration_version,
    discoveryRunId: row.discovery_run_id,
    sourceType: row.source_type,
    sourceKey: row.source_key,
    discoveredUrl: row.discovered_url,
    discoveredAt: new Date(row.discovered_at),
    sourceUrl: row.source_url ?? undefined,
    title: row.title ?? undefined,
    snippet: row.snippet ?? undefined,
    anchorText: row.anchor_text ?? undefined,
    sourceRank: row.source_rank ?? undefined,
    metadata: row.metadata,
    idempotencyKey: row.idempotency_key,
    normalizedUrl: row.normalized_url,
    normalizedUrlHash: row.normalized_url_hash,
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

export function normalizeFrontierUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase().replace(/\.$/u, '');
    if (
      (url.protocol === 'http:' && url.port === '80') ||
      (url.protocol === 'https:' && url.port === '443')
    ) {
      url.port = '';
    }
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function urlFrontierHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
