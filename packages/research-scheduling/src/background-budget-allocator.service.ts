import {
  BackgroundBudgetAllocation,
  TopicResearchSnapshot,
} from './domain/research-scheduling-types';
import { BACKGROUND_INTENSITY_WEIGHTS } from './research-scheduling-defaults';

export class BackgroundBudgetAllocator {
  allocate(topics: TopicResearchSnapshot[]): BackgroundBudgetAllocation[] {
    const activeTopics = topics.filter((topic) => topic.lifecycle === 'active');
    const totalWeight = activeTopics.reduce(
      (sum, topic) =>
        sum + BACKGROUND_INTENSITY_WEIGHTS[topic.researchPolicy.backgroundIntensity],
      0,
    );

    return topics.map((topic) => {
      if (topic.lifecycle !== 'active') {
        return {
          topicId: topic.topicId,
          lifecycle: topic.lifecycle,
          intensity: topic.researchPolicy.backgroundIntensity,
          allocatedCrawlBudget: 0,
          allocatedSerpBudget: 0,
          allocatedDiscoveryBudget: 0,
          fairnessWeight: 0,
          eligible: false,
          reason: `Topic lifecycle ${topic.lifecycle} is not eligible for background research.`,
        };
      }

      const weight =
        BACKGROUND_INTENSITY_WEIGHTS[topic.researchPolicy.backgroundIntensity];
      const share = totalWeight > 0 ? weight / totalWeight : 0;

      return {
        topicId: topic.topicId,
        lifecycle: topic.lifecycle,
        intensity: topic.researchPolicy.backgroundIntensity,
        allocatedCrawlBudget: Math.floor(topic.researchPolicy.dailyCrawlBudget * share),
        allocatedSerpBudget: Math.floor(
          topic.researchPolicy.dailySerpRefreshBudget * share,
        ),
        allocatedDiscoveryBudget: Math.floor(
          (topic.researchPolicy.dailyKeywordExpansionBudget +
            topic.researchPolicy.dailyDomainDiscoveryBudget) *
            share,
        ),
        fairnessWeight: weight,
        eligible: true,
        reason: 'Active topic receives fair background budget share.',
      };
    });
  }
}
