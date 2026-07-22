import { SerpPack } from '@seo-kb/serp-intelligence';
import { SerpIntentPackService } from '../serp-intent-pack.service';
import { InMemorySerpIntentRepository } from '../testing/in-memory-serp-intent.repository';

describe('SerpIntentRepository', () => {
  it('preserves the latest SERP Intent Pack by query context', async () => {
    const repository = new InMemorySerpIntentRepository();
    const pack = new SerpIntentPackService().build({
      serpPack: fixtureSerpPack(),
    });

    await repository.saveSerpIntentPack({
      pack,
      createdAt: '2026-07-23T00:00:00.000Z',
    });

    await expect(
      repository.findLatestSerpIntentPack({
        normalizedQuery: 'laser hair removal warsaw',
        topicId: 'topic-1',
      }),
    ).resolves.toMatchObject({
      id: 'serp-intent-pack-1',
      normalizedQuery: 'laser hair removal warsaw',
      topicId: 'topic-1',
      createdAt: '2026-07-23T00:00:00.000Z',
    });
  });
});

function fixtureSerpPack(): SerpPack {
  return {
    normalizedQuery: 'laser hair removal warsaw',
    topicId: 'topic-1',
    snapshotIds: ['snapshot-1'],
    recurringHeadings: [],
    recurringFaqs: [],
    recurringEntities: [],
    dominantContentAngle: 'unknown',
    secondaryContentAngles: [],
    depthSummary: {
      wordCount: { min: null, median: null, max: null },
      sectionCount: { min: null, median: null, max: null },
      faqCount: { min: null, median: null, max: null },
      tableUsageRatio: 0,
      listUsageRatio: 0,
      comparisonUsageRatio: 0,
      sampleSize: 0,
    },
    expectations: [],
    missingOpportunities: [],
    degraded: true,
    warnings: ['empty SERP Pack'],
    ruleVersion: 'serp-intelligence-foundation-v1',
  };
}
