import { SeoPackService } from './seo-pack.service';

describe('SeoPackService', () => {
  it('assembles a model-agnostic SEO Pack from upstream pack-like inputs', () => {
    const pack = new SeoPackService().build({
      topicId: 'topic-1',
      candidateKey: 'candidate:laser-hair-removal-warsaw',
      language: 'en',
      geo: { country: 'PL', city: 'Warsaw' },
      knowledgePack: {
        packId: 'knowledge-pack-1',
        summary: 'Laser hair removal knowledge summary.',
        entities: [
          {
            entityId: 'entity:procedure',
            label: 'Laser hair removal',
            type: 'procedure',
            confidence: 'high',
            sourceReferences: [{ sourceId: 'source-1', sourceType: 'page' }],
          },
        ],
        facts: [
          {
            factId: 'fact:aftercare',
            statement: 'Aftercare instructions should be followed after treatment.',
            entityIds: ['entity:procedure'],
            confidence: 'high',
            sourceReferences: [{ sourceId: 'source-1', sourceType: 'page' }],
          },
        ],
      },
      demandPack: {
        packId: 'demand-pack-1',
        primaryKeyword: 'laser hair removal warsaw',
        demandSummary: 'Repeated demand signals for local treatment pages.',
      },
      serpPack: {
        packId: 'serp-pack-1',
        summary: 'Top SERP pages emphasize price, safety and clinic location.',
        headings: [{ heading: 'Laser Hair Removal Prices', frequency: 3 }],
        faqQuestions: [
          {
            question: 'How much does laser hair removal cost in Warsaw?',
            confidence: 'medium',
          },
        ],
        competitorInsights: [
          {
            insight: 'Competitors use local trust signals and clinic proof.',
            confidence: 'medium',
          },
        ],
        contentDepthExpectation: 'Cover prices, body areas, safety and aftercare.',
      },
      serpIntentPack: {
        packId: 'intent-pack-1',
        intents: [
          {
            intentId: 'intent:price',
            label: 'Understand local pricing',
            priority: 'mandatory',
            confidence: 'high',
            question: 'What affects laser hair removal prices?',
          },
          {
            intentId: 'intent:aftercare',
            label: 'Understand aftercare',
            priority: 'opportunity',
            confidence: 'medium',
          },
        ],
      },
      candidateScoringPack: {
        packId: 'scoring-pack-1',
        scoredCandidates: [
          {
            candidateKey: 'candidate:laser-hair-removal-warsaw',
            label: 'Laser hair removal Warsaw',
            recommendedPageType: 'local_page',
            opportunityScore: 76,
            confidence: 'medium',
            rationale: ['Strong local long-tail opportunity.'],
          },
        ],
      },
      topicExpansionPack: {
        packId: 'expansion-pack-1',
        candidateLabels: ['laser hair removal prices warsaw'],
      },
      longTailDiscoveryPack: {
        packId: 'long-tail-pack-1',
        questionCandidates: ['Is laser hair removal painful?'],
      },
    });

    expect(pack).toMatchObject({
      packKey: 'topic-1:candidate:laser-hair-removal-warsaw:local_page',
      topicId: 'topic-1',
      candidateKey: 'candidate:laser-hair-removal-warsaw',
      pageType: 'local_page',
      degraded: false,
      pageBrief: {
        titleConcept: 'Laser hair removal Warsaw',
        primaryIntent: 'Understand local pricing',
        demandSummary: 'Repeated demand signals for local treatment pages.',
      },
    });
    expect(pack.requiredEntities).toHaveLength(1);
    expect(pack.requiredFacts).toHaveLength(1);
    expect(pack.recommendedOutline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sectionKey: 'overview',
          requiredEntityIds: ['entity:procedure'],
          requiredFactIds: ['fact:aftercare'],
        }),
        expect.objectContaining({
          sectionKey: 'intent:intent:price',
        }),
      ]),
    );
    expect(pack.faqRecommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          question: 'How much does laser hair removal cost in Warsaw?',
        }),
        expect.objectContaining({
          question: 'Is laser hair removal painful?',
          priority: 'opportunity',
        }),
      ]),
    );
    expect(pack.mandatorySerpIntents).toEqual([
      expect.objectContaining({ label: 'Understand local pricing' }),
    ]);
    expect(pack.generationConstraints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'cite_required_fact' }),
        expect.objectContaining({ code: 'cover_required_intent' }),
        expect.objectContaining({ code: 'respect_language_geo' }),
      ]),
    );
    expect(pack.sourcePackReferences).toEqual(
      expect.arrayContaining([
        { packType: 'knowledge_pack', packId: 'knowledge-pack-1' },
        { packType: 'candidate_scoring_pack', packId: 'scoring-pack-1' },
      ]),
    );
  });

  it('continues in degraded mode when optional source packs are unavailable', () => {
    const pack = new SeoPackService().build({
      topicId: 'topic-1',
      candidateKey: 'candidate:fallback',
      demandPack: {
        primaryKeyword: 'fallback keyword',
        nullableMetricsWarning: 'Paid metrics are unavailable.',
      },
    });

    expect(pack.degraded).toBe(true);
    expect(pack.warnings).toEqual(
      expect.arrayContaining([
        'SEO Pack built without Knowledge Pack',
        'SEO Pack built without SERP Pack',
        'SEO Pack built without SERP Intent Pack',
        'SEO Pack built without Candidate Scoring Pack',
      ]),
    );
    expect(pack.uncertainty.missingPackWarnings).toEqual(
      expect.arrayContaining(['SEO Pack built without Knowledge Pack']),
    );
    expect(pack.pageBrief.titleConcept).toBe('fallback keyword');
    expect(pack.recommendedOutline[0].warnings).toEqual([
      'Outline built without Knowledge Pack facts',
    ]);
  });
});
