import { BackgroundBudgetAllocator } from './background-budget-allocator.service';
import { MediaResearchPolicyService } from './media-research-policy.service';
import { ResearchSchedulingService } from './research-scheduling.service';
import { ResearchOperationsFrontierTelemetryService } from './research-operations-frontier-telemetry.service';
import { ResearchOperationsHealthService } from './research-operations-health.service';
import { ResearchOperationsSnapshotService } from './research-operations-snapshot.service';
import { ResearchSchedulerControlService } from './research-scheduler-control.service';
import { ResearchSchedulerTickPlannerService } from './research-scheduler-tick-planner.service';
import { TopicResearchPolicy } from './domain/research-scheduling-types';
import { InMemoryResearchSchedulingRepository } from './testing/in-memory-research-scheduling.repository';

const policy: TopicResearchPolicy = {
  backgroundIntensity: 'normal',
  dailyCrawlBudget: 30,
  dailySerpRefreshBudget: 12,
  dailyKeywordExpansionBudget: 20,
  dailyDomainDiscoveryBudget: 10,
  recrawlTtlHours: 24,
  maxCrawlDepth: 2,
  maxPages: 100,
  perHostRateLimitPerMinute: 6,
  mediaPolicy: { mode: 'metadata_only' },
};

describe('ResearchSchedulingService', () => {
  it('plans focused research with preemptive priority and bounded dispatches', () => {
    const plan = new ResearchSchedulingService().plan({
      topicId: 'topic-1',
      mode: 'focused',
      trigger: 'generation_request',
      objective: {
        type: 'generate_page',
        query: 'laser hair removal warsaw',
      },
      topicSnapshot: {
        topicId: 'topic-1',
        lifecycle: 'active',
        configurationVersion: 3,
        researchPolicy: policy,
      },
      freshnessEvidence: [
        {
          assetKey: 'serp:laser-hair-removal-warsaw',
          lastProcessedAt: '2026-07-20T00:00:00.000Z',
          ttlHours: 24,
          now: '2026-07-23T00:00:00.000Z',
        },
      ],
      createdAt: '2026-07-23T00:00:00.000Z',
    });

    expect(plan.job).toMatchObject({
      mode: 'focused',
      priorityClass: 'highest',
      trigger: 'generation_request',
    });
    expect(plan.freshnessDecisions[0]).toMatchObject({
      status: 'refresh',
      shouldCrawl: true,
      shouldRefreshSerp: true,
    });
    expect(plan.dispatchCommands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ target: 'discovery_sources' }),
        expect.objectContaining({ target: 'serp_intelligence' }),
        expect.objectContaining({ target: 'url_frontier' }),
        expect.objectContaining({ target: 'seo_pack' }),
      ]),
    );
    expect(plan.ruleVersion).toBe('research-scheduling-v1');
  });

  it('allocates background budget fairly only to active topics', () => {
    const allocations = new BackgroundBudgetAllocator().allocate([
      {
        topicId: 'low',
        lifecycle: 'active',
        configurationVersion: 1,
        researchPolicy: { ...policy, backgroundIntensity: 'low' },
      },
      {
        topicId: 'high',
        lifecycle: 'active',
        configurationVersion: 1,
        researchPolicy: { ...policy, backgroundIntensity: 'high' },
      },
      {
        topicId: 'paused',
        lifecycle: 'paused',
        configurationVersion: 1,
        researchPolicy: policy,
      },
    ]);

    expect(allocations.find((allocation) => allocation.topicId === 'paused')).toMatchObject({
      eligible: false,
      allocatedCrawlBudget: 0,
    });
    expect(
      allocations.find((allocation) => allocation.topicId === 'high')
        ?.allocatedCrawlBudget,
    ).toBeGreaterThan(
      allocations.find((allocation) => allocation.topicId === 'low')
        ?.allocatedCrawlBudget ?? 0,
    );
  });

  it('keeps media metadata-only by default and allows selected downloads explicitly', () => {
    const service = new MediaResearchPolicyService();

    expect(
      service.decide(
        { mode: 'metadata_only' },
        {
          assetId: 'media-1',
          topicId: 'topic-1',
          mediaType: 'image',
          mediaPotential: 0.95,
        },
      ),
    ).toMatchObject({
      storageStatus: 'metadata_only',
      shouldDownload: false,
    });

    expect(
      service.decide(
        { mode: 'selected', allowedMediaTypes: ['image'] },
        {
          assetId: 'media-1',
          topicId: 'topic-1',
          mediaType: 'image',
          mediaPotential: 0.95,
        },
      ),
    ).toMatchObject({
      storageStatus: 'selected_for_download',
      shouldDownload: true,
    });
  });

  it('reports production research operations health without using queue depth as state', () => {
    const report = new ResearchOperationsHealthService({
      maxExpiredFrontierLeases: 0,
      maxFrontierEnqueueFailures: 0,
      maxEligibleFrontierBacklog: 100,
      maxOldestEligibleFrontierAgeMinutes: 60,
      maxTopicsWithoutRecentBackgroundResearch: 0,
    }).evaluate({
      schedulerEnabled: true,
      activeTopicCount: 4,
      eligibleBackgroundTopicCount: 4,
      topicsWithoutRecentBackgroundResearch: 1,
      expiredFrontierLeaseCount: 2,
      frontierEnqueueFailureCount: 1,
      eligibleFrontierBacklogCount: 250,
      oldestEligibleFrontierAgeMinutes: 90,
      observedAt: '2026-07-26T00:00:00.000Z',
    });

    expect(report.healthy).toBe(false);
    expect(report.degraded).toBe(true);
    expect(report.alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'expired_frontier_leases' }),
      expect.objectContaining({ code: 'queue_enqueue_failures' }),
      expect.objectContaining({ code: 'frontier_backlog_high' }),
      expect.objectContaining({ code: 'background_starvation' }),
    ]));
  });

  it('builds research operations snapshots from topic and frontier telemetry', () => {
    const snapshot = new ResearchOperationsSnapshotService().build({
      schedulerEnabled: true,
      recentBackgroundResearchWindowHours: 24,
      observedAt: '2026-07-26T00:00:00.000Z',
      topicSnapshots: [
        {
          topicId: 'active-fresh',
          lifecycle: 'active',
          configurationVersion: 1,
          researchPolicy: policy,
          lastBackgroundResearchAt: '2026-07-25T12:00:00.000Z',
        },
        {
          topicId: 'active-stale',
          lifecycle: 'active',
          configurationVersion: 1,
          researchPolicy: policy,
          lastBackgroundResearchAt: '2026-07-20T00:00:00.000Z',
        },
        {
          topicId: 'paused',
          lifecycle: 'paused',
          configurationVersion: 1,
          researchPolicy: policy,
        },
      ],
      frontierTelemetry: {
        expiredLeaseCount: 2,
        enqueueFailureCount: 1,
        eligibleBacklogCount: 250,
        oldestEligibleFrontierAgeMinutes: 90,
      },
    });

    expect(snapshot).toMatchObject({
      schedulerEnabled: true,
      activeTopicCount: 2,
      eligibleBackgroundTopicCount: 2,
      topicsWithoutRecentBackgroundResearch: 1,
      expiredFrontierLeaseCount: 2,
      frontierEnqueueFailureCount: 1,
      eligibleFrontierBacklogCount: 250,
      oldestEligibleFrontierAgeMinutes: 90,
    });
  });

  it('maps URL Frontier operations telemetry without owning enqueue failures', () => {
    const telemetry = new ResearchOperationsFrontierTelemetryService()
      .fromUrlFrontier({
        urlFrontierTelemetry: {
          topicId: null,
          expiredLeaseCount: 2,
          eligibleBacklogCount: 250,
          oldestEligibleFrontierAgeMinutes: 90,
          observedAt: '2026-07-26T00:00:00.000Z',
        },
        enqueueFailureCount: 1,
      });

    expect(telemetry).toEqual({
      expiredLeaseCount: 2,
      enqueueFailureCount: 1,
      eligibleBacklogCount: 250,
      oldestEligibleFrontierAgeMinutes: 90,
    });
  });

  it('keeps scheduler control fail-safe until explicitly enabled', async () => {
    const service = new ResearchSchedulerControlService(
      new InMemoryResearchSchedulingRepository(),
    );

    await expect(service.getState()).resolves.toMatchObject({
      state: 'disabled',
      updatedBy: 'system',
    });

    await expect(service.setState({
      state: 'enabled',
      requestedBy: 'operator-1',
      requestedAt: '2026-07-26T00:00:00.000Z',
    })).resolves.toMatchObject({
      state: 'enabled',
      reason: null,
      updatedBy: 'operator-1',
    });
  });

  it('requires an auditable reason when pausing or disabling scheduler execution', async () => {
    const service = new ResearchSchedulerControlService(
      new InMemoryResearchSchedulingRepository(),
    );

    await expect(service.setState({
      state: 'paused',
      requestedBy: 'operator-1',
      requestedAt: '2026-07-26T00:00:00.000Z',
    })).rejects.toThrow('reason is required');

    await expect(service.setState({
      state: 'disabled',
      reason: 'Maintenance window',
      requestedBy: 'operator-1',
      requestedAt: '2026-07-26T00:00:00.000Z',
    })).resolves.toMatchObject({
      state: 'disabled',
      reason: 'Maintenance window',
    });
  });

  it('skips scheduler ticks when scheduler execution is disabled', () => {
    const plan = new ResearchSchedulerTickPlannerService().plan({
      observedAt: '2026-07-26T00:00:00.000Z',
      controlState: {
        state: 'disabled',
        reason: 'Maintenance window',
        updatedBy: 'operator-1',
        updatedAt: '2026-07-26T00:00:00.000Z',
      },
      topicSnapshots: [
        {
          topicId: 'active',
          lifecycle: 'active',
          configurationVersion: 1,
          researchPolicy: policy,
        },
      ],
    });

    expect(plan).toMatchObject({
      status: 'skipped',
      schedulerState: 'disabled',
      backgroundAllocations: [],
      skippedReason: 'Maintenance window',
      degraded: false,
    });
  });

  it('plans scheduler ticks through fair background allocations when enabled', () => {
    const plan = new ResearchSchedulerTickPlannerService().plan({
      observedAt: '2026-07-26T00:00:00.000Z',
      controlState: {
        state: 'enabled',
        reason: null,
        updatedBy: 'operator-1',
        updatedAt: '2026-07-26T00:00:00.000Z',
      },
      topicSnapshots: [
        {
          topicId: 'active',
          lifecycle: 'active',
          configurationVersion: 1,
          researchPolicy: policy,
        },
        {
          topicId: 'paused',
          lifecycle: 'paused',
          configurationVersion: 1,
          researchPolicy: policy,
        },
      ],
    });

    expect(plan).toMatchObject({
      status: 'planned',
      schedulerState: 'enabled',
      skippedReason: null,
      degraded: false,
    });
    expect(plan.backgroundAllocations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        topicId: 'active',
        eligible: true,
      }),
      expect.objectContaining({
        topicId: 'paused',
        eligible: false,
      }),
    ]));
  });
});
