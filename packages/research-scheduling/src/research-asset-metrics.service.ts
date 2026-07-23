import {
  ResearchAssetMetric,
  ResearchDispatchPlan,
} from './domain/research-scheduling-types';

export class ResearchAssetMetricsService {
  fromDispatchPlan(plan: ResearchDispatchPlan, observedAt: string): ResearchAssetMetric[] {
    return plan.dispatchCommands.map((command) => ({
      topicId: command.topicId,
      metricType:
        command.target === 'serp_intelligence'
          ? 'serp_snapshots_collected'
          : command.target === 'discovery_sources'
            ? 'unprocessed_discovery_count'
            : command.target === 'content_processing'
              ? 'documents_processed'
              : 'pages_crawled',
      metricValue: 0,
      sourceSubsystem: command.target,
      observedAt,
      metadata: {
        planned: true,
        reason: command.reason,
      },
    }));
  }
}
