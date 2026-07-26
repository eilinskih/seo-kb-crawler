import {
  ResearchOperationsAlert,
  ResearchOperationsHealthReport,
  ResearchOperationsSnapshot,
  ResearchOperationsThresholds,
} from './domain/research-scheduling-types';
import { DEFAULT_RESEARCH_SCHEDULING_RULE_VERSION } from './research-scheduling-defaults';

export const DEFAULT_RESEARCH_OPERATIONS_THRESHOLDS: ResearchOperationsThresholds = {
  maxExpiredFrontierLeases: 0,
  maxFrontierEnqueueFailures: 0,
  maxEligibleFrontierBacklog: 10_000,
  maxOldestEligibleFrontierAgeMinutes: 120,
  maxTopicsWithoutRecentBackgroundResearch: 0,
};

export class ResearchOperationsHealthService {
  constructor(
    private readonly thresholds = DEFAULT_RESEARCH_OPERATIONS_THRESHOLDS,
  ) {}

  evaluate(snapshot: ResearchOperationsSnapshot): ResearchOperationsHealthReport {
    const alerts = this.alerts(snapshot);
    return {
      snapshot,
      healthy: alerts.every((alert) => alert.severity === 'info'),
      degraded: alerts.length > 0,
      alerts,
      generatedAt: snapshot.observedAt,
      ruleVersion: DEFAULT_RESEARCH_SCHEDULING_RULE_VERSION,
    };
  }

  private alerts(snapshot: ResearchOperationsSnapshot): ResearchOperationsAlert[] {
    const alerts: ResearchOperationsAlert[] = [];

    if (!snapshot.schedulerEnabled) {
      alerts.push({
        code: 'scheduler_disabled',
        severity: 'warning',
        message: 'Research scheduler is disabled.',
        observedValue: false,
      });
    }

    if (snapshot.activeTopicCount === 0) {
      alerts.push({
        code: 'no_active_topics',
        severity: 'info',
        message: 'No active topics are eligible for background research.',
        observedValue: 0,
      });
    }

    this.pushCountAlert(
      alerts,
      snapshot.expiredFrontierLeaseCount,
      this.thresholds.maxExpiredFrontierLeases,
      'expired_frontier_leases',
      'URL Frontier has expired leases that require recovery attention.',
    );
    this.pushCountAlert(
      alerts,
      snapshot.frontierEnqueueFailureCount,
      this.thresholds.maxFrontierEnqueueFailures,
      'queue_enqueue_failures',
      'URL Frontier dispatch leases may have failed to enqueue transport jobs.',
    );
    this.pushCountAlert(
      alerts,
      snapshot.eligibleFrontierBacklogCount,
      this.thresholds.maxEligibleFrontierBacklog,
      'frontier_backlog_high',
      'Eligible URL Frontier backlog exceeds the configured threshold.',
    );

    const oldestAge = snapshot.oldestEligibleFrontierAgeMinutes ?? 0;
    this.pushCountAlert(
      alerts,
      oldestAge,
      this.thresholds.maxOldestEligibleFrontierAgeMinutes,
      'frontier_backlog_high',
      'Oldest eligible URL Frontier entry has waited longer than the configured threshold.',
    );

    this.pushCountAlert(
      alerts,
      snapshot.topicsWithoutRecentBackgroundResearch,
      this.thresholds.maxTopicsWithoutRecentBackgroundResearch,
      'background_starvation',
      'One or more active topics have not received recent background research.',
    );

    return alerts;
  }

  private pushCountAlert(
    alerts: ResearchOperationsAlert[],
    observedValue: number,
    threshold: number,
    code: ResearchOperationsAlert['code'],
    message: string,
  ): void {
    if (observedValue <= threshold) {
      return;
    }
    alerts.push({
      code,
      severity: observedValue > threshold * 2 ? 'critical' : 'warning',
      message,
      observedValue,
      threshold,
    });
  }
}
