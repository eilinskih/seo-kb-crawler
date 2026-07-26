import {
  BackgroundBudgetAllocationRecord,
  ResearchDispatchExecutionReceiptRecord,
  ResearchDispatchPlanRecord,
  ResearchSchedulingRepository,
  SaveBackgroundBudgetAllocationsCommand,
  SaveResearchDispatchExecutionReceiptsCommand,
  SaveResearchDispatchPlanCommand,
  SaveResearchSchedulerControlStateCommand,
} from '../persistence/research-scheduling.repository';
import { ResearchSchedulerControlState } from '../domain/research-scheduling-types';

export class InMemoryResearchSchedulingRepository
  implements ResearchSchedulingRepository
{
  private readonly plans: ResearchDispatchPlanRecord[] = [];
  private readonly allocations: BackgroundBudgetAllocationRecord[] = [];
  private readonly receipts: ResearchDispatchExecutionReceiptRecord[] = [];
  private schedulerControlState: ResearchSchedulerControlState | null = null;

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
    const nextIndex = this.allocations.length + 1;
    const records = command.allocations.map((allocation, index) => ({
      ...allocation,
      id: `background-budget-allocation-${nextIndex + index}`,
      createdAt: command.createdAt,
    }));
    this.allocations.push(...records);
    return records;
  }

  async getSchedulerControlState(): Promise<ResearchSchedulerControlState | null> {
    return this.schedulerControlState;
  }

  async saveSchedulerControlState(
    command: SaveResearchSchedulerControlStateCommand,
  ): Promise<ResearchSchedulerControlState> {
    this.schedulerControlState = command.state;
    return command.state;
  }

  async saveDispatchExecutionReceipts(
    command: SaveResearchDispatchExecutionReceiptsCommand,
  ): Promise<ResearchDispatchExecutionReceiptRecord[]> {
    const nextIndex = this.receipts.length + 1;
    const records = command.receipts.map((receipt, index) => ({
      ...receipt,
      id: `research-dispatch-receipt-${nextIndex + index}`,
      dispatchPlanId: command.dispatchPlanId ?? null,
      createdAt: command.createdAt,
    }));
    this.receipts.push(...records);
    return records;
  }
}
