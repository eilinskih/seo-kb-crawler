import {
  ResearchDispatchPlan,
  ResearchPlanRequest,
} from './domain/research-scheduling-types';
import { DEFAULT_RESEARCH_SCHEDULING_RULE_VERSION } from './research-scheduling-defaults';
import { FreshnessPolicyService } from './freshness-policy.service';
import { ResearchAssetMetricsService } from './research-asset-metrics.service';
import { ResearchDispatchPlanner } from './research-dispatch-planner.service';
import { ResearchJobService } from './research-job.service';

export class ResearchSchedulingService {
  constructor(
    private readonly jobService = new ResearchJobService(),
    private readonly freshnessService = new FreshnessPolicyService(),
    private readonly dispatchPlanner = new ResearchDispatchPlanner(),
    private readonly metricsService = new ResearchAssetMetricsService(),
  ) {}

  plan(request: ResearchPlanRequest): ResearchDispatchPlan {
    const job = this.jobService.createJob(request);
    const lifecycleWarnings = this.lifecycleWarnings(request);
    const freshnessDecisions = (request.freshnessEvidence ?? []).map((evidence) =>
      this.freshnessService.decide(evidence),
    );
    const dispatchCommands = this.dispatchPlanner.plan(job, freshnessDecisions);
    const warnings = [
      ...job.warnings,
      ...lifecycleWarnings,
      ...freshnessDecisions.flatMap((decision) => decision.warnings),
    ];

    const partialPlan = {
      job,
      freshnessDecisions,
      dispatchCommands,
      assetMetrics: [],
      warnings,
      degraded:
        warnings.length > 0 ||
        request.topicSnapshot.lifecycle !== 'active' ||
        dispatchCommands.length === 0,
      ruleVersion: DEFAULT_RESEARCH_SCHEDULING_RULE_VERSION,
    };

    return {
      ...partialPlan,
      assetMetrics: [
        ...(request.existingAssetMetrics ?? []),
        ...this.metricsService.fromDispatchPlan(partialPlan, job.createdAt),
      ],
    };
  }

  private lifecycleWarnings(request: ResearchPlanRequest): string[] {
    if (request.topicSnapshot.lifecycle === 'archived') {
      return ['Archived topics are excluded from normal research scheduling'];
    }
    if (request.topicSnapshot.lifecycle === 'paused' && !request.force) {
      return ['Paused topic requires an explicit forced manual or focused request'];
    }
    if (request.topicSnapshot.lifecycle === 'draft') {
      return ['Draft topic is not eligible for research scheduling'];
    }
    return [];
  }
}
