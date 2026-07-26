import {
  BackgroundBudgetAllocationRecord,
  ResearchDispatchPlanRecord,
  ResearchSchedulingRepository,
} from './persistence/research-scheduling.repository';
import { ResearchSchedulerControlService } from './research-scheduler-control.service';
import {
  ResearchSchedulerTickPlannerService,
} from './research-scheduler-tick-planner.service';
import { ResearchSchedulingService } from './research-scheduling.service';
import {
  BackgroundBudgetAllocation,
  FreshnessEvidence,
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
  persistedDispatchPlans: ResearchDispatchPlanRecord[];
}

export class ResearchSchedulerWorkerLoopService {
  private readonly controlService: ResearchSchedulerControlService;
  private readonly tickPlanner: ResearchSchedulerTickPlannerService;
  private readonly schedulingService = new ResearchSchedulingService();

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
        persistedDispatchPlans: [],
      };
    }

    const persistedBackgroundAllocations =
      await this.repository.saveBackgroundBudgetAllocations({
        allocations: tickPlan.backgroundAllocations,
        createdAt: input.observedAt,
      });
    const persistedDispatchPlans = await this.persistDispatchPlans(
      tickPlan.backgroundAllocations,
      input.topicSnapshots,
      input.observedAt,
    );

    return {
      tickPlan,
      persistedBackgroundAllocations,
      persistedDispatchPlans,
    };
  }

  private async persistDispatchPlans(
    allocations: BackgroundBudgetAllocation[],
    topicSnapshots: TopicResearchSnapshot[],
    observedAt: string,
  ): Promise<ResearchDispatchPlanRecord[]> {
    const topicById = new Map(
      topicSnapshots.map((topic) => [topic.topicId, topic]),
    );
    const records: ResearchDispatchPlanRecord[] = [];

    for (const allocation of allocations) {
      const topicSnapshot = topicById.get(allocation.topicId);
      if (!allocation.eligible || !topicSnapshot) {
        continue;
      }

      const plan = this.schedulingService.plan({
        topicId: allocation.topicId,
        mode: 'background',
        trigger: 'background_growth',
        objective: {
          type: 'background_growth',
          payload: {
            allocation,
          },
        },
        topicSnapshot,
        freshnessEvidence: freshnessEvidenceFromAllocation(
          allocation,
          topicSnapshot,
          observedAt,
        ),
        createdAt: observedAt,
      });

      records.push(await this.repository.saveDispatchPlan({
        plan,
        createdAt: observedAt,
      }));
    }

    return records;
  }
}

function freshnessEvidenceFromAllocation(
  allocation: BackgroundBudgetAllocation,
  topic: TopicResearchSnapshot,
  observedAt: string,
): FreshnessEvidence[] {
  const evidence: FreshnessEvidence[] = [];

  if (allocation.allocatedCrawlBudget > 0) {
    evidence.push({
      assetKey: `url-frontier:${allocation.topicId}:stale-pages`,
      lastSerpSnapshotAt: observedAt,
      ttlHours: topic.researchPolicy.recrawlTtlHours,
      now: observedAt,
    });
  }

  if (allocation.allocatedSerpBudget > 0) {
    evidence.push({
      assetKey: `serp:${allocation.topicId}:scheduled-refresh`,
      ttlHours: 24,
      now: observedAt,
    });
  }

  return evidence;
}
