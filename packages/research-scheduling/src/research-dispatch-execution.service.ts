import {
  ResearchDispatchCommand,
  ResearchDispatchExecutionReceipt,
  ResearchDispatchExecutionReport,
  ResearchDispatchPlan,
} from './domain/research-scheduling-types';

export interface ResearchDispatchCommandExecutor {
  execute(
    command: ResearchDispatchCommand,
    attemptedAt: string,
  ): Promise<ResearchDispatchExecutionReceipt>;
}

export class ResearchDispatchExecutionService {
  constructor(private readonly executor: ResearchDispatchCommandExecutor) {}

  async executePlan(
    plan: ResearchDispatchPlan,
    attemptedAt: string,
  ): Promise<ResearchDispatchExecutionReport> {
    const receipts: ResearchDispatchExecutionReceipt[] = [];

    for (const command of plan.dispatchCommands) {
      receipts.push(await this.executeCommand(command, attemptedAt));
    }

    return {
      receipts,
      frontierEnqueueFailureCount: receipts.filter((receipt) =>
        receipt.target === 'url_frontier' && receipt.status === 'failed',
      ).length,
      failedCount: receipts.filter((receipt) => receipt.status === 'failed').length,
      attemptedAt,
    };
  }

  private async executeCommand(
    command: ResearchDispatchCommand,
    attemptedAt: string,
  ): Promise<ResearchDispatchExecutionReceipt> {
    try {
      return await this.executor.execute(command, attemptedAt);
    } catch (error) {
      return {
        target: command.target,
        topicId: command.topicId,
        objective: command.objective,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Dispatch failed.',
        attemptedAt,
      };
    }
  }
}
