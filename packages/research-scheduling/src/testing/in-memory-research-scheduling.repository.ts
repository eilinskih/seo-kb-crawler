import {
  BackgroundBudgetAllocationRecord,
  ResearchDispatchPlanRecord,
  ResearchSchedulingRepository,
  SaveBackgroundBudgetAllocationsCommand,
  SaveResearchDispatchPlanCommand,
} from '../persistence/research-scheduling.repository';

export class InMemoryResearchSchedulingRepository
  implements ResearchSchedulingRepository
{
  private readonly plans: ResearchDispatchPlanRecord[] = [];
  private readonly allocations: BackgroundBudgetAllocationRecord[] = [];

  async saveDispatchPlan(
    command: SaveResearchDispatchPlanCommand,
  ): Promise<ResearchDispatchPlanRecord> {
    const record = {
      ...command.plan,
      id: `research-dispatch-plan-${this.plans.length + 1}`,
      createdAt: command.createdAt,
    };
    this.plans.push(record);
    return record;
  }

  async findLatestDispatchPlan(
    topicId: string,
  ): Promise<ResearchDispatchPlanRecord | null> {
    return [...this.plans].reverse().find((plan) => plan.job.topicId === topicId) ?? null;
  }

  async saveBackgroundBudgetAllocations(
    command: SaveBackgroundBudgetAllocationsCommand,
  ): Promise<BackgroundBudgetAllocationRecord[]> {
    const records = command.allocations.map((allocation) => ({
      ...allocation,
      id: `background-budget-allocation-${this.allocations.length + 1}`,
      createdAt: command.createdAt,
    }));
    this.allocations.push(...records);
    return records;
  }
}
