import { BackgroundBudgetAllocator } from './background-budget-allocator.service';
import {
  ResearchSchedulerControlState,
  ResearchSchedulerTickPlan,
  TopicResearchSnapshot,
} from './domain/research-scheduling-types';
import { DEFAULT_RESEARCH_SCHEDULING_RULE_VERSION } from './research-scheduling-defaults';

export interface ResearchSchedulerTickPlannerInput {
  controlState: ResearchSchedulerControlState;
  topicSnapshots: TopicResearchSnapshot[];
  observedAt: string;
}

export class ResearchSchedulerTickPlannerService {
  constructor(
    private readonly backgroundBudgetAllocator = new BackgroundBudgetAllocator(),
  ) {}

  plan(input: ResearchSchedulerTickPlannerInput): ResearchSchedulerTickPlan {
    if (input.controlState.state !== 'enabled') {
      return {
        status: 'skipped',
        schedulerState: input.controlState.state,
        backgroundAllocations: [],
        skippedReason:
          input.controlState.reason ??
          `Scheduler is ${input.controlState.state}.`,
        warnings: [],
        degraded: false,
        observedAt: input.observedAt,
        ruleVersion: DEFAULT_RESEARCH_SCHEDULING_RULE_VERSION,
      };
    }

    const backgroundAllocations = this.backgroundBudgetAllocator.allocate(
      input.topicSnapshots,
    );
    const activeAllocationCount = backgroundAllocations.filter((allocation) =>
      allocation.eligible,
    ).length;
    const warnings = activeAllocationCount === 0
      ? ['No active topics are eligible for background scheduling.']
      : [];

    return {
      status: 'planned',
      schedulerState: input.controlState.state,
      backgroundAllocations,
      skippedReason: null,
      warnings,
      degraded: warnings.length > 0,
      observedAt: input.observedAt,
      ruleVersion: DEFAULT_RESEARCH_SCHEDULING_RULE_VERSION,
    };
  }
}
