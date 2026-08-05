import { PlanningPackFreshnessService } from './planning-pack-freshness.service';

describe('PlanningPackFreshnessService', () => {
  it('reports missing required planning packs as refresh-required operator visibility', () => {
    const report = new PlanningPackFreshnessService().evaluate({
      topicId: 'topic-1',
      candidateKey: 'candidate-1',
      observedAt: '2026-07-27T00:00:00.000Z',
      requirements: [
        { packType: 'serp_pack', required: true, ttlHours: 24 },
        { packType: 'seo_pack', required: true, ttlHours: 12 },
      ],
      existingPacks: [{
        packType: 'serp_pack',
        packId: 'serp-pack-1',
        topicId: 'topic-1',
        createdAt: '2026-07-26T23:00:00.000Z',
      }],
    });

    expect(report).toMatchObject({
      refreshRequired: true,
      missingRequiredCount: 1,
      staleCount: 0,
    });
    expect(report.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        packType: 'seo_pack',
        status: 'missing',
        refreshRequired: true,
      }),
    ]));
  });

  it('reports stale planning packs and preserves subsystem warnings', () => {
    const report = new PlanningPackFreshnessService().evaluate({
      topicId: 'topic-1',
      observedAt: '2026-07-27T00:00:00.000Z',
      requirements: [
        { packType: 'candidate_scoring_pack', required: true, ttlHours: 24 },
      ],
      existingPacks: [{
        packType: 'candidate_scoring_pack',
        packId: 'candidate-scoring-pack-1',
        topicId: 'topic-1',
        createdAt: '2026-07-25T00:00:00.000Z',
        warnings: ['missing provider metrics'],
      }],
    });

    expect(report).toMatchObject({
      refreshRequired: true,
      missingRequiredCount: 0,
      staleCount: 1,
    });
    expect(report.items[0]).toMatchObject({
      status: 'stale',
      ageHours: 48,
      warnings: ['missing provider metrics'],
    });
  });
});
