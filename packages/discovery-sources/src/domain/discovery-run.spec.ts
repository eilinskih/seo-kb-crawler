import { Topic } from '@seo-kb/topic-engine';
import { validTopicInput } from '@seo-kb/topic-engine/testing/topic.fixture';
import { DiscoveryPlanner } from './discovery-planner';
import { DiscoveryRun } from './discovery-run';

describe('DiscoveryRun', () => {
  it('tracks the approved lifecycle without relying on BullMQ retries', () => {
    const snapshot = Topic.create(validTopicInput()).toSnapshot();
    const [plan] = new DiscoveryPlanner().plan(snapshot);
    const run = DiscoveryRun.create(plan, new Date('2026-07-03T00:00:00Z'));

    run.queue(new Date('2026-07-03T00:01:00Z'));
    run.lease(
      'worker-1',
      new Date('2026-07-03T00:10:00Z'),
      new Date('2026-07-03T00:02:00Z'),
    );
    run.start(new Date('2026-07-03T00:03:00Z'));
    run.complete(10, 8, new Date('2026-07-03T00:04:00Z'));

    expect(run.toRecord()).toMatchObject({
      status: 'completed',
      attempt: 1,
      itemsExamined: 10,
      observationsEmitted: 8,
      leaseOwner: null,
      leaseExpiresAt: null,
    });
  });

  it('returns expired leased work to queued state', () => {
    const snapshot = Topic.create(validTopicInput()).toSnapshot();
    const [plan] = new DiscoveryPlanner().plan(snapshot);
    const run = DiscoveryRun.create(plan);

    run.queue();
    run.lease(
      'worker-1',
      new Date('2026-07-03T00:10:00Z'),
      new Date('2026-07-03T00:00:00Z'),
    );
    run.expireLease(new Date('2026-07-03T00:11:00Z'));

    expect(run.toRecord()).toMatchObject({
      status: 'queued',
      leaseOwner: null,
      leaseExpiresAt: null,
    });
  });

  it('clears retry and checkpoint state after successful completion', () => {
    const snapshot = Topic.create(validTopicInput()).toSnapshot();
    const [plan] = new DiscoveryPlanner().plan(snapshot);
    const run = DiscoveryRun.create(plan);

    run.queue(new Date('2026-07-03T00:00:00Z'));
    run.lease(
      'worker-1',
      new Date('2026-07-03T00:10:00Z'),
      new Date('2026-07-03T00:01:00Z'),
    );
    run.start(new Date('2026-07-03T00:02:00Z'));
    run.markPartial(
      { cursor: 'page-2' },
      10,
      5,
      new Date('2026-07-03T00:03:00Z'),
    );
    run.queue(new Date('2026-07-03T00:04:00Z'));
    run.lease(
      'worker-2',
      new Date('2026-07-03T00:20:00Z'),
      new Date('2026-07-03T00:05:00Z'),
    );
    run.start(new Date('2026-07-03T00:06:00Z'));
    run.fail(
      'failed_retryable',
      'provider_unavailable',
      'Temporary provider outage',
      new Date('2026-07-03T00:30:00Z'),
      new Date('2026-07-03T00:07:00Z'),
    );
    run.queue(new Date('2026-07-03T00:31:00Z'));
    run.lease(
      'worker-3',
      new Date('2026-07-03T00:40:00Z'),
      new Date('2026-07-03T00:32:00Z'),
    );
    run.start(new Date('2026-07-03T00:33:00Z'));
    run.complete(4, 3, new Date('2026-07-03T00:34:00Z'));

    expect(run.toRecord()).toMatchObject({
      status: 'completed',
      checkpoint: null,
      failureCategory: null,
      failureDetail: null,
      nextAttemptAt: null,
      itemsExamined: 14,
      observationsEmitted: 8,
    });
  });
});
