import { Topic } from '@seo-kb/topic-engine';
import { validTopicInput } from '@seo-kb/topic-engine/testing/topic.fixture';
import { TopicSnapshot } from '@seo-kb/topic-engine';
import {
  UrlFrontierPendingObservation,
  UrlFrontierRepository,
} from '../domain/url-frontier-types';
import { KnexUrlFrontierRepository } from '../persistence/knex-url-frontier.repository';
import {
  evaluatePreCrawlObservation,
  UrlFrontierReevaluationService,
} from './url-frontier-reevaluation.service';

describe('UrlFrontierReevaluationService', () => {
  it('accepts relevant pre-crawl evidence and creates frontier entries', async () => {
    const snapshot = snapshotFixture();
    const observation = observationFixture({
      topicId: snapshot.topicId,
      title: 'Technical SEO crawler guide',
      snippet: 'A crawler checklist for search engine optimization.',
    });
    const repository = repositoryDouble([observation]);
    const service = new UrlFrontierReevaluationService(
      repository,
      topicServiceDouble(snapshot),
    );

    const result = await service.reevaluatePending({
      limit: 5,
      now: new Date('2026-07-23T00:00:00Z'),
    });

    expect(result).toMatchObject({
      examined: 1,
      upsertedEntries: 1,
      linkedObservations: 1,
      accepted: 1,
    });
    expect(repository.upserted[0]).toMatchObject({
      topicId: snapshot.topicId,
      normalizedUrl: 'https://example.com/guides/technical-seo',
      relevanceDecision: 'accepted',
      crawlPolicyFingerprint: snapshot.crawlPolicyFingerprint,
    });
  });

  it('rejects observations outside topic crawl policy', () => {
    const evaluation = evaluatePreCrawlObservation(
      observationFixture({ normalizedUrl: 'https://other.example/page' }),
      snapshotFixture(),
    );

    expect(evaluation).toMatchObject({
      relevanceDecision: 'rejected',
      relevanceScore: 0,
      priorityScore: 0,
      relevanceExplanation: {
        reason: 'host_not_allowed',
        host: 'other.example',
      },
    });
  });

  it('keeps exploratory candidates as insufficient evidence when allowed', () => {
    const evaluation = evaluatePreCrawlObservation(
      observationFixture({
        discoveredUrl: 'https://example.com/guides/crawler',
        normalizedUrl: 'https://example.com/guides/crawler',
        title: 'Crawler guide',
      }),
      snapshotFixture(),
    );

    expect(evaluation).toMatchObject({
      relevanceDecision: 'insufficient_evidence',
      relevanceScore: null,
      priorityScore: 365,
      relevanceExplanation: {
        reason: 'missing_required_pre_crawl_evidence',
        exploratoryCrawlAllowed: true,
      },
    });
  });
});

function snapshotFixture(): TopicSnapshot {
  return Topic.create(validTopicInput()).toSnapshot(
    new Date('2026-07-23T00:00:00Z'),
  );
}

function observationFixture(
  overrides: Partial<UrlFrontierPendingObservation> = {},
): UrlFrontierPendingObservation {
  return {
    observationId: 'observation-1',
    topicId: 'topic-1',
    topicConfigurationVersion: 1,
    discoveryRunId: 'run-1',
    sourceType: 'seed',
    sourceKey: 'seed-source',
    discoveredUrl: 'https://example.com/guides/technical-seo',
    discoveredAt: new Date('2026-07-23T00:00:00Z'),
    metadata: {},
    idempotencyKey: 'observation-key',
    normalizedUrl: 'https://example.com/guides/technical-seo',
    normalizedUrlHash: 'hash',
    ...overrides,
  };
}

function repositoryDouble(
  observations: UrlFrontierPendingObservation[],
): KnexUrlFrontierRepository & { upserted: Parameters<UrlFrontierRepository['upsertEntry']>[0][] } {
  const upserted: Parameters<UrlFrontierRepository['upsertEntry']>[0][] = [];
  return {
    upserted,
    listPendingDiscoveryObservations: jest.fn(async () => observations),
    upsertEntry: jest.fn(async (seed) => {
      upserted.push(seed);
    }),
    linkDiscoveryObservation: jest.fn(async () => true),
  } as unknown as KnexUrlFrontierRepository & {
    upserted: Parameters<UrlFrontierRepository['upsertEntry']>[0][];
  };
}

function topicServiceDouble(snapshot: TopicSnapshot) {
  return {
    getSnapshot: jest.fn(async () => snapshot),
  } as never;
}
