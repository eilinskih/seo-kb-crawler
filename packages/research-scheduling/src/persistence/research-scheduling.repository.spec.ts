import { InMemoryResearchSchedulingRepository } from '../testing/in-memory-research-scheduling.repository';
import { ResearchDispatchPlan } from '../domain/research-scheduling-types';

describe('ResearchSchedulingRepository', () => {
  it('preserves the latest dispatch plan by topic', async () => {
    const repository = new InMemoryResearchSchedulingRepository();
    const plan: ResearchDispatchPlan = {
      job: {
        jobKey: 'topic-1:focused:generate_page:1',
        topicId: 'topic-1',
        mode: 'focused',
        priorityClass: 'highest',
        trigger: 'generation_request',
        objective: { type: 'generate_page' },
        requestedBy: null,
        createdAt: '2026-07-23T00:00:00.000Z',
        warnings: [],
        degraded: false,
      },
      freshnessDecisions: [],
      dispatchCommands: [],
      assetMetrics: [],
      warnings: [],
      degraded: false,
      ruleVersion: 'research-scheduling-v1',
    };

    await repository.saveDispatchPlan({
      plan,
      createdAt: '2026-07-23T00:00:00.000Z',
    });
    await repository.saveDispatchPlan({
      plan: { ...plan, warnings: ['newer'] },
      createdAt: '2026-07-23T01:00:00.000Z',
    });

    await expect(repository.findLatestDispatchPlan('topic-1')).resolves.toMatchObject({
      id: 'research-dispatch-plan-2',
      warnings: ['newer'],
    });
  });
});
