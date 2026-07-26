import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  BackgroundBudgetAllocation,
  ResearchDispatchExecutionReceipt,
  ResearchDispatchPlan,
  ResearchSchedulerControlState,
} from '../domain/research-scheduling-types';
import {
  BackgroundBudgetAllocationRecord,
  ResearchDispatchExecutionReceiptRecord,
  ResearchDispatchPlanRecord,
  ResearchSchedulingRepository,
  SaveBackgroundBudgetAllocationsCommand,
  SaveResearchDispatchExecutionReceiptsCommand,
  SaveResearchDispatchPlanCommand,
  SaveResearchSchedulerControlStateCommand,
} from './research-scheduling.repository';

const SCHEDULER_CONTROL_STATE_ID = 'global';

interface ResearchSchedulerControlStateRow {
  id: string;
  state: ResearchSchedulerControlState['state'];
  reason: string | null;
  updated_by: string;
  updated_at: Date | string;
}

interface ResearchDispatchPlanRow {
  id: string;
  topic_id: string;
  mode: string;
  trigger: string;
  priority_class: string;
  objective_type: string;
  plan: ResearchDispatchPlan;
  degraded: boolean;
  created_at: Date | string;
}

interface ResearchBackgroundBudgetAllocationRow {
  id: string;
  topic_id: string;
  lifecycle: BackgroundBudgetAllocation['lifecycle'];
  intensity: BackgroundBudgetAllocation['intensity'];
  allocated_crawl_budget: number;
  allocated_serp_budget: number;
  allocated_discovery_budget: number;
  fairness_weight: string | number;
  eligible: boolean;
  reason: string;
  created_at: Date | string;
}

interface ResearchDispatchExecutionReceiptRow {
  id: string;
  dispatch_plan_id: string | null;
  topic_id: string;
  target: ResearchDispatchExecutionReceipt['target'];
  status: ResearchDispatchExecutionReceipt['status'];
  objective: ResearchDispatchExecutionReceipt['objective'];
  message: string;
  attempted_at: Date | string;
  created_at: Date | string;
}

@Injectable()
export class KnexResearchSchedulingRepository
  implements ResearchSchedulingRepository
{
  constructor(private readonly db: DbService) {}

  async saveDispatchPlan(
    command: SaveResearchDispatchPlanCommand,
  ): Promise<ResearchDispatchPlanRecord> {
    const row = toDispatchPlanRow(command.plan, command.createdAt);
    await this.db.knex<ResearchDispatchPlanRow>('research_dispatch_plans')
      .insert(row);
    return toDispatchPlanRecord(row);
  }

  async findLatestDispatchPlan(
    topicId: string,
  ): Promise<ResearchDispatchPlanRecord | null> {
    const row = await this.db.knex<ResearchDispatchPlanRow>(
      'research_dispatch_plans',
    )
      .where('topic_id', topicId)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .first();

    return row ? toDispatchPlanRecord(row) : null;
  }

  async saveBackgroundBudgetAllocations(
    command: SaveBackgroundBudgetAllocationsCommand,
  ): Promise<BackgroundBudgetAllocationRecord[]> {
    const rows = command.allocations.map((allocation) =>
      toBackgroundBudgetAllocationRow(allocation, command.createdAt),
    );

    if (rows.length > 0) {
      await this.db.knex<ResearchBackgroundBudgetAllocationRow>(
        'research_background_budget_allocations',
      ).insert(rows);
    }

    return rows.map(toBackgroundBudgetAllocationRecord);
  }

  async getSchedulerControlState(): Promise<ResearchSchedulerControlState | null> {
    const row = await this.db.knex<ResearchSchedulerControlStateRow>(
      'research_scheduler_control_state',
    )
      .where('id', SCHEDULER_CONTROL_STATE_ID)
      .first();

    return row ? toSchedulerControlState(row) : null;
  }

  async saveSchedulerControlState(
    command: SaveResearchSchedulerControlStateCommand,
  ): Promise<ResearchSchedulerControlState> {
    const row = toSchedulerControlStateRow(command.state);
    await this.db.knex<ResearchSchedulerControlStateRow>(
      'research_scheduler_control_state',
    )
      .insert(row)
      .onConflict('id')
      .merge({
        state: row.state,
        reason: row.reason,
        updated_by: row.updated_by,
        updated_at: row.updated_at,
      });

    return command.state;
  }

  async saveDispatchExecutionReceipts(
    command: SaveResearchDispatchExecutionReceiptsCommand,
  ): Promise<ResearchDispatchExecutionReceiptRecord[]> {
    const rows = command.receipts.map((receipt) =>
      toDispatchExecutionReceiptRow(
        receipt,
        command.dispatchPlanId ?? null,
        command.createdAt,
      ),
    );

    if (rows.length > 0) {
      await this.db.knex<ResearchDispatchExecutionReceiptRow>(
        'research_dispatch_execution_receipts',
      ).insert(rows);
    }

    return rows.map(toDispatchExecutionReceiptRecord);
  }
}

function toDispatchPlanRow(
  plan: ResearchDispatchPlan,
  createdAt: string,
): ResearchDispatchPlanRow {
  return {
    id: randomUUID(),
    topic_id: plan.job.topicId,
    mode: plan.job.mode,
    trigger: plan.job.trigger,
    priority_class: plan.job.priorityClass,
    objective_type: plan.job.objective.type,
    plan,
    degraded: plan.degraded,
    created_at: createdAt,
  };
}

function toDispatchPlanRecord(
  row: ResearchDispatchPlanRow,
): ResearchDispatchPlanRecord {
  return {
    ...row.plan,
    id: row.id,
    createdAt: toIsoString(row.created_at),
  };
}

function toBackgroundBudgetAllocationRow(
  allocation: BackgroundBudgetAllocation,
  createdAt: string,
): ResearchBackgroundBudgetAllocationRow {
  return {
    id: randomUUID(),
    topic_id: allocation.topicId,
    lifecycle: allocation.lifecycle,
    intensity: allocation.intensity,
    allocated_crawl_budget: allocation.allocatedCrawlBudget,
    allocated_serp_budget: allocation.allocatedSerpBudget,
    allocated_discovery_budget: allocation.allocatedDiscoveryBudget,
    fairness_weight: allocation.fairnessWeight,
    eligible: allocation.eligible,
    reason: allocation.reason,
    created_at: createdAt,
  };
}

function toBackgroundBudgetAllocationRecord(
  row: ResearchBackgroundBudgetAllocationRow,
): BackgroundBudgetAllocationRecord {
  return {
    id: row.id,
    topicId: row.topic_id,
    lifecycle: row.lifecycle,
    intensity: row.intensity,
    allocatedCrawlBudget: row.allocated_crawl_budget,
    allocatedSerpBudget: row.allocated_serp_budget,
    allocatedDiscoveryBudget: row.allocated_discovery_budget,
    fairnessWeight: Number(row.fairness_weight),
    eligible: row.eligible,
    reason: row.reason,
    createdAt: toIsoString(row.created_at),
  };
}

function toSchedulerControlStateRow(
  state: ResearchSchedulerControlState,
): ResearchSchedulerControlStateRow {
  return {
    id: SCHEDULER_CONTROL_STATE_ID,
    state: state.state,
    reason: state.reason,
    updated_by: state.updatedBy,
    updated_at: state.updatedAt,
  };
}

function toSchedulerControlState(
  row: ResearchSchedulerControlStateRow,
): ResearchSchedulerControlState {
  return {
    state: row.state,
    reason: row.reason,
    updatedBy: row.updated_by,
    updatedAt: toIsoString(row.updated_at),
  };
}

function toDispatchExecutionReceiptRow(
  receipt: ResearchDispatchExecutionReceipt,
  dispatchPlanId: string | null,
  createdAt: string,
): ResearchDispatchExecutionReceiptRow {
  return {
    id: randomUUID(),
    dispatch_plan_id: dispatchPlanId,
    topic_id: receipt.topicId,
    target: receipt.target,
    status: receipt.status,
    objective: receipt.objective,
    message: receipt.message,
    attempted_at: receipt.attemptedAt,
    created_at: createdAt,
  };
}

function toDispatchExecutionReceiptRecord(
  row: ResearchDispatchExecutionReceiptRow,
): ResearchDispatchExecutionReceiptRecord {
  return {
    id: row.id,
    dispatchPlanId: row.dispatch_plan_id,
    target: row.target,
    topicId: row.topic_id,
    objective: row.objective,
    status: row.status,
    message: row.message,
    attemptedAt: toIsoString(row.attempted_at),
    createdAt: toIsoString(row.created_at),
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
