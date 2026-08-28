import {
  __testing,
  KnexSeoPackRepository,
} from './knex-seo-pack.repository';
import { SeoPack } from '../domain/seo-pack-types';

describe('KnexSeoPackRepository', () => {
  it('can be constructed with the database boundary', () => {
    const repository = new KnexSeoPackRepository({} as never);

    expect(repository).toBeInstanceOf(KnexSeoPackRepository);
  });

  it('maps SEO Packs into reusable candidate-keyed rows', () => {
    const pack = fixturePack();

    expect(
      __testing.toPackRow({
        pack,
        createdAt: '2026-07-26T00:00:00.000Z',
      }),
    ).toMatchObject({
      topic_id: 'topic-1',
      candidate_key: 'candidate-1',
      pack_key: 'topic-1:candidate-1:local_page',
      page_type: 'local_page',
      language_key: 'en',
      geo_key: JSON.stringify({
        country: 'PL',
        region: null,
        city: 'Warsaw',
      }),
      source_pack_references: JSON.stringify(pack.sourcePackReferences),
      uncertainty: JSON.stringify(pack.uncertainty),
      pack: JSON.stringify(pack),
      created_at: '2026-07-26T00:00:00.000Z',
    });
  });
});

function fixturePack(): SeoPack {
  return {
    packKey: 'topic-1:candidate-1:local_page',
    topicId: 'topic-1',
    candidateKey: 'candidate-1',
    pageType: 'local_page',
    language: 'en',
    geo: { country: 'PL', city: 'Warsaw' },
    pageBrief: {
      titleConcept: 'Laser hair removal Warsaw',
      targetAudience: null,
      primaryIntent: 'Book local clinic',
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
    sourcePackReferences: [{
      packType: 'candidate_scoring_pack',
      packId: 'candidate-scoring-pack-1',
    }],
    ruleVersion: 'seo-pack-v1',
  };
}
