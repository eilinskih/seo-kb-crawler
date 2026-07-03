import { Topic } from '@seo-kb/topic-engine';
import { validTopicInput } from '@seo-kb/topic-engine/testing/topic.fixture';
import { DiscoveryPlanner } from './discovery-planner';

describe('DiscoveryPlanner', () => {
  it('plans deterministic runs from one topic snapshot', () => {
    const input = validTopicInput();
    input.discovery.sitemaps = {
      enabled: true,
      urls: ['https://example.com/sitemap.xml'],
    };
    input.discovery.seeds = {
      enabled: true,
      urls: ['https://example.com/', 'https://example.com/blog'],
    };
    const snapshot = Topic.create(input).toSnapshot();
    const planner = new DiscoveryPlanner();

    const first = planner.plan(snapshot, { searchProviderKey: 'mock-search' });
    const second = planner.plan(snapshot, { searchProviderKey: 'mock-search' });

    expect(first).toHaveLength(3);
    expect(first.map((plan) => plan.sourceType)).toEqual([
      'search',
      'sitemap',
      'seed',
    ]);
    expect(first.map((plan) => plan.sourceKey)).toEqual(
      second.map((plan) => plan.sourceKey),
    );
    expect(first.map((plan) => plan.planningKey)).toEqual(
      second.map((plan) => plan.planningKey),
    );
  });

  it('creates one seed run for all configured seed URLs', () => {
    const input = validTopicInput();
    input.discovery.search.enabled = false;
    input.discovery.search.queries = [];
    input.discovery.seeds = {
      enabled: true,
      urls: ['https://example.com/a', 'https://example.com/b'],
    };
    const snapshot = Topic.create(input).toSnapshot();

    const [plan] = new DiscoveryPlanner().plan(snapshot);

    expect(plan.sourceType).toBe('seed');
    expect(plan.configuration).toEqual({
      sourceType: 'seed',
      urls: ['https://example.com/a', 'https://example.com/b'],
    });
  });
});
