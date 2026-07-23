import { BackgroundBudgetAllocator } from './background-budget-allocator.service';
import { MediaResearchPolicyService } from './media-research-policy.service';
import { ResearchSchedulingService } from './research-scheduling.service';
import { TopicResearchPolicy } from './domain/research-scheduling-types';

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
});
