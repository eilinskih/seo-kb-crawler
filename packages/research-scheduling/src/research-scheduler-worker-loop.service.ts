import {
  BackgroundBudgetAllocationRecord,
  ResearchSchedulingRepository,
} from './persistence/research-scheduling.repository';
import { ResearchSchedulerControlService } from './research-scheduler-control.service';
import {
  ResearchSchedulerTickPlannerService,
} from './research-scheduler-tick-planner.service';
import {
  ResearchSchedulerTickPlan,
  TopicResearchSnapshot,
} from './domain/research-scheduling-types';

export interface ResearchSchedulerRunOnceInput {
  topicSnapshots: TopicResearchSnapshot[];
  observedAt: string;
}

export interface ResearchSchedulerRunOnceResult {
  tickPlan: ResearchSchedulerTickPlan;
  persistedBackgroundAllocations: BackgroundBudgetAllocationRecord[];
}

export class ResearchSchedulerWorkerLoopService {
  private readonly controlService: ResearchSchedulerControlService;
  private readonly tickPlanner: ResearchSchedulerTickPlannerService;

  constructor(private readonly repository: ResearchSchedulingRepository) {
    this.controlService = new ResearchSchedulerControlService(repository);
    this.tickPlanner = new ResearchSchedulerTickPlannerService();
  }

  async runOnce(
    input: ResearchSchedulerRunOnceInput,
  ): Promise<ResearchSchedulerRunOnceResult> {
    const controlState = await this.controlService.getState();
    const tickPlan = this.tickPlanner.plan({
      controlState,
      topicSnapshots: input.topicSnapshots,
      observedAt: input.observedAt,
    });

    if (tickPlan.status === 'skipped') {
      return {
        tickPlan,
        persistedBackgroundAllocations: [],
      };
    }

    const persistedBackgroundAllocations =
      await this.repository.saveBackgroundBudgetAllocations({
        allocations: tickPlan.backgroundAllocations,
        createdAt: input.observedAt,
      });

    return {
      tickPlan,
      persistedBackgroundAllocations,
    };
  }
}
