import {
  KnexUrlFrontierRepository,
  UrlCanonicalRelationRow,
  UrlFrontierEntryRow,
} from '../persistence/knex-url-frontier.repository';
import { UrlFrontierCanonicalService } from './url-frontier-canonical.service';

describe('UrlFrontierCanonicalService', () => {
  it('records and consolidates canonical duplicates when the target entry exists', async () => {
    const source = entryFixture({
      id: 'source-entry',
      normalized_url: 'https://example.com/page?ref=1',
      normalized_url_hash: 'source-hash',
    });
    const target = entryFixture({
      id: 'target-entry',
      normalized_url: 'https://example.com/page',
      normalized_url_hash: 'target-hash',
    });
    const repository = repositoryDouble(source, target);

    const result = await new UrlFrontierCanonicalService(
      repository,
    ).recordCanonicalRelation({
      sourceFrontierEntryId: source.id,
      targetCanonicalUrl: target.normalized_url,
      evidenceType: 'html_link',
      evidence: { crawlAttemptId: 'attempt-1' },
      now: new Date('2026-07-23T00:00:00Z'),
    });

    expect(result).toMatchObject({
      status: 'consolidated',
      targetFrontierEntryId: 'target-entry',
    });
    expect(repository.relations[0]).toMatchObject({
      source_frontier_entry_id: 'source-entry',
      target_frontier_entry_id: 'target-entry',
      accepted: true,
    });
    expect(repository.suppressed).toEqual([{
      sourceEntryId: 'source-entry',
      targetNormalizedUrl: 'https://example.com/page',
      canonicalSource: 'html_link',
    }]);
  });

  it('records unresolved canonical evidence when the target entry is missing', async () => {
    const source = entryFixture({ id: 'source-entry' });
    const repository = repositoryDouble(source, null);

    const result = await new UrlFrontierCanonicalService(
      repository,
    ).recordCanonicalRelation({
      sourceFrontierEntryId: source.id,
      targetCanonicalUrl: 'https://example.com/canonical',
      evidenceType: 'redirect',
      evidence: { statusCode: 301 },
      now: new Date('2026-07-23T00:00:00Z'),
    });

    expect(result).toMatchObject({
      status: 'recorded_unresolved',
      targetFrontierEntryId: null,
      reason: 'target_entry_missing',
    });
    expect(repository.suppressed).toEqual([]);
  });

  it('rejects cross-host canonical targets when policy is same-host', async () => {
    const source = entryFixture({ id: 'source-entry' });
    const repository = repositoryDouble(source, null);

    const result = await new UrlFrontierCanonicalService(
      repository,
    ).recordCanonicalRelation({
      sourceFrontierEntryId: source.id,
      targetCanonicalUrl: 'https://other.example/canonical',
      evidenceType: 'html_link',
      evidence: {},
      now: new Date('2026-07-23T00:00:00Z'),
    });

    expect(result).toMatchObject({
      status: 'rejected',
      reason: 'target_host_not_allowed',
    });
    expect(repository.relations[0]).toMatchObject({
      accepted: false,
      rejection_reason: 'target_host_not_allowed',
    });
  });
});

function repositoryDouble(
  source: UrlFrontierEntryRow,
  target: UrlFrontierEntryRow | null,
): KnexUrlFrontierRepository & {
  relations: UrlCanonicalRelationRow[];
  suppressed: Array<{
    sourceEntryId: string;
    targetNormalizedUrl: string;
    canonicalSource: string;
  }>;
} {
  const relations: UrlCanonicalRelationRow[] = [];
  const suppressed: Array<{
    sourceEntryId: string;
    targetNormalizedUrl: string;
    canonicalSource: string;
  }> = [];
  return {
    relations,
    suppressed,
    findEntryById: jest.fn(async () => source),
    findEntryByTopicAndUrlHash: jest.fn(async () => target),
    insertCanonicalRelation: jest.fn(async (row: UrlCanonicalRelationRow) => {
      relations.push(row);
    }),
    suppressCanonicalDuplicate: jest.fn(async (
      sourceEntryId: string,
      targetNormalizedUrl: string,
      canonicalSource: string,
    ) => {
      suppressed.push({ sourceEntryId, targetNormalizedUrl, canonicalSource });
      return true;
    }),
  } as unknown as KnexUrlFrontierRepository & {
    relations: UrlCanonicalRelationRow[];
    suppressed: Array<{
      sourceEntryId: string;
      targetNormalizedUrl: string;
      canonicalSource: string;
    }>;
  };
}

function entryFixture(
  overrides: Partial<UrlFrontierEntryRow> = {},
): UrlFrontierEntryRow {
  return {
    id: 'entry-1',
    topic_id: 'topic-1',
    topic_configuration_version: 1,
    normalized_url: 'https://example.com/source',
    normalized_url_hash: 'source-hash',
    crawl_policy_fingerprint: 'policy',
    crawl_policy: {
      userAgent: 'seo-kb-crawler',
      respectRobots: true,
      allowedHosts: ['example.com'],
      deniedHosts: [],
      crossHostCanonicalPolicy: 'same-host',
      maxBodyBytes: 1000,
      maxRedirects: 5,
      timeoutMs: 30000,
      maxOutgoingLinks: 100,
      maxMediaAssets: 25,
    },
    priority_score: 1,
    relevance_score: 1,
    relevance_decision: 'accepted',
    relevance_explanation: null,
    relevance_profile_version: 1,
    crawl_status: 'scheduled',
    next_crawl_at: new Date('2026-07-23T00:00:00Z'),
    lease_owner: null,
    lease_expires_at: null,
    active_attempt_id: null,
    canonical_url: null,
    canonical_source: null,
    suppression_reason: null,
    last_crawled_at: null,
    consecutive_failures: 0,
    created_at: new Date('2026-07-23T00:00:00Z'),
    updated_at: new Date('2026-07-23T00:00:00Z'),
    ...overrides,
  };
}
