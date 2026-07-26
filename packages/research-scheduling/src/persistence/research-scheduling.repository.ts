import {
  BackgroundBudgetAllocation,
  ResearchDispatchPlan,
  ResearchSchedulerControlState,
} from '../domain/research-scheduling-types';

export interface SaveResearchDispatchPlanCommand {
  plan: ResearchDispatchPlan;
  createdAt: string;
}

export interface ResearchDispatchPlanRecord extends ResearchDispatchPlan {
  id: string;
  createdAt: string;
}

export interface SaveBackgroundBudgetAllocationsCommand {
  allocations: BackgroundBudgetAllocation[];
  createdAt: string;
}

export interface BackgroundBudgetAllocationRecord
  extends BackgroundBudgetAllocation {
  id: string;
  createdAt: string;
}

export interface SaveResearchSchedulerControlStateCommand {
  state: ResearchSchedulerControlState;
}

export interface ResearchSchedulingRepository {
  saveDispatchPlan(
    command: SaveResearchDispatchPlanCommand,
  ): Promise<ResearchDispatchPlanRecord>;
  findLatestDispatchPlan(topicId: string): Promise<ResearchDispatchPlanRecord | null>;
  saveBackgroundBudgetAllocations(
    command: SaveBackgroundBudgetAllocationsCommand,
  ): Promise<BackgroundBudgetAllocationRecord[]>;
  getSchedulerControlState(): Promise<ResearchSchedulerControlState | null>;
  saveSchedulerControlState(
    command: SaveResearchSchedulerControlStateCommand,
  ): Promise<ResearchSchedulerControlState>;
}
