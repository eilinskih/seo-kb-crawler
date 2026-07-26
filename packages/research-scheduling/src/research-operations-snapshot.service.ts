import {
  ResearchOperationsSnapshot,
  ResearchOperationsSnapshotInput,
  TopicResearchSnapshot,
} from './domain/research-scheduling-types';

export class ResearchOperationsSnapshotService {
  build(input: ResearchOperationsSnapshotInput): ResearchOperationsSnapshot {
    const activeTopics = input.topicSnapshots.filter((topic) =>
      topic.lifecycle === 'active',
    );
    const backgroundWindowMs =
      input.recentBackgroundResearchWindowHours * 60 * 60 * 1000;
    const observedAtMs = Date.parse(input.observedAt);

    return {
      schedulerEnabled: input.schedulerEnabled,
      activeTopicCount: activeTopics.length,
      eligibleBackgroundTopicCount: activeTopics.length,
      topicsWithoutRecentBackgroundResearch: activeTopics.filter((topic) =>
        !hasRecentBackgroundResearch(topic, observedAtMs, backgroundWindowMs),
      ).length,
      expiredFrontierLeaseCount: input.frontierTelemetry.expiredLeaseCount,
      frontierEnqueueFailureCount: input.frontierTelemetry.enqueueFailureCount,
      eligibleFrontierBacklogCount: input.frontierTelemetry.eligibleBacklogCount,
      oldestEligibleFrontierAgeMinutes:
        input.frontierTelemetry.oldestEligibleFrontierAgeMinutes,
      observedAt: input.observedAt,
    };
  }
}

function hasRecentBackgroundResearch(
  topic: TopicResearchSnapshot,
  observedAtMs: number,
  backgroundWindowMs: number,
): boolean {
  if (!topic.lastBackgroundResearchAt) {
    return false;
  }
  return observedAtMs - Date.parse(topic.lastBackgroundResearchAt) <=
    backgroundWindowMs;
}
