import { InMemorySeoPackRepository } from '../testing/in-memory-seo-pack.repository';
import { SeoPack } from '../domain/seo-pack-types';

describe('SeoPackRepository', () => {
  it('preserves the latest SEO Pack by topic and candidate', async () => {
    const repository = new InMemorySeoPackRepository();
    const basePack: SeoPack = {
      packKey: 'topic-1:candidate-1:guide',
      topicId: 'topic-1',
      candidateKey: 'candidate-1',
      pageType: 'guide',
      pageBrief: {
        titleConcept: 'Candidate 1',
        targetAudience: null,
        primaryIntent: null,
        secondaryIntents: [],
        candidateRationale: [],
        demandSummary: null,
        serpSummary: null,
        knowledgeSummary: null,
        evidenceGaps: [],
        nonGoals: [],
      },
      recommendedOutline: [],
      faqRecommendations: [],
      requiredEntities: [],
      requiredFacts: [],
      mandatorySerpIntents: [],
      opportunityIntents: [],
      serpExpectations: [],
      competitorInsights: [],
      internalLinkingHints: [],
      generationConstraints: [],
      sourceReferences: [],
      uncertainty: {
        evidenceGaps: [],
        unresolvedConflicts: [],
        weakEvidenceWarnings: [],
        missingPackWarnings: [],
      },
      warnings: [],
      degraded: false,
      sourcePackReferences: [],
      ruleVersion: 'seo-pack-v1',
    };

    await repository.saveSeoPack({
      pack: basePack,
      createdAt: '2026-07-23T00:00:00.000Z',
    });
    await repository.saveSeoPack({
      pack: { ...basePack, warnings: ['newer'] },
      createdAt: '2026-07-23T01:00:00.000Z',
    });

    await expect(
      repository.findLatestSeoPack('topic-1', 'candidate-1'),
    ).resolves.toMatchObject({
      id: 'seo-pack-2',
      warnings: ['newer'],
    });
  });
});
