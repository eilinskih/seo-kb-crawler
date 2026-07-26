import { ResearchDispatchExecutionService } from './research-dispatch-execution.service';
import {
  ResearchDispatchExecutionReport,
  TopicResearchSnapshot,
} from './domain/research-scheduling-types';
import {
  ResearchDispatchExecutionReceiptRecord,
  ResearchSchedulingRepository,
} from './persistence/research-scheduling.repository';
import { ResearchSchedulerWorkerLoopService } from './research-scheduler-worker-loop.service';

export interface ResearchSchedulerTopicSnapshotProvider {
  listTopicSnapshots(): Promise<TopicResearchSnapshot[]>;
}

export interface ResearchSchedulerDaemonOptions {
  intervalMs: number;
  now?: () => string;
}

export interface ResearchSchedulerDaemonTickResult {
  dispatchReports: ResearchDispatchExecutionReport[];
  persistedReceipts: ResearchDispatchExecutionReceiptRecord[];
  skipped: boolean;
}

export class ResearchSchedulerDaemonService {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly repository: ResearchSchedulingRepository,
    private readonly topicSnapshotProvider: ResearchSchedulerTopicSnapshotProvider,
    private readonly dispatchExecutionService: ResearchDispatchExecutionService,
    private readonly options: ResearchSchedulerDaemonOptions,
  ) {
    if (!Number.isInteger(options.intervalMs) || options.intervalMs < 1) {
      throw new Error('intervalMs must be a positive integer');
    }
  }

  start(): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      void this.tick();
    }, this.options.intervalMs);
  }

  stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  async tick(): Promise<ResearchSchedulerDaemonTickResult | null> {
    if (this.running) {
      return null;
    }

    this.running = true;
    try {
      const observedAt = this.options.now?.() ?? new Date().toISOString();
      const run = await new ResearchSchedulerWorkerLoopService(this.repository)
        .runOnce({
          topicSnapshots: await this.topicSnapshotProvider.listTopicSnapshots(),
          observedAt,
        });

      if (run.tickPlan.status === 'skipped') {
        return {
          dispatchReports: [],
          persistedReceipts: [],
          skipped: true,
        };
      }

      const persistedReceipts: ResearchDispatchExecutionReceiptRecord[] = [];
      const dispatchReports: ResearchDispatchExecutionReport[] = [];

      for (const plan of run.persistedDispatchPlans) {
        const report = await this.dispatchExecutionService.executePlan(
          plan,
          observedAt,
        );
        dispatchReports.push(report);
        persistedReceipts.push(
          ...await this.repository.saveDispatchExecutionReceipts({
            dispatchPlanId: plan.id,
            receipts: report.receipts,
            createdAt: observedAt,
          }),
        );
      }

      return {
        dispatchReports,
        persistedReceipts,
        skipped: false,
      };
    } finally {
      this.running = false;
    }
  }
}
