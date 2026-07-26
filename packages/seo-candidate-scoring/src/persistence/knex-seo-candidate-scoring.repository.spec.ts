import {
  __testing,
  KnexSeoCandidateScoringRepository,
} from './knex-seo-candidate-scoring.repository';
import { CandidateScoringPack } from '../domain/seo-candidate-scoring-types';

describe('KnexSeoCandidateScoringRepository', () => {
  it('can be constructed with the database boundary', () => {
    const repository = new KnexSeoCandidateScoringRepository({} as never);

    expect(repository).toBeInstanceOf(KnexSeoCandidateScoringRepository);
  });

  it('maps Candidate Scoring Packs into reusable topic-keyed rows', () => {
    const pack = fixturePack();

    expect(
      __testing.toPackRow({
        pack,
        createdAt: '2026-07-26T00:00:00.000Z',
      }),
    ).toMatchObject({
      topic_id: 'topic-1',
      profile: 'default',
      language_key: 'en',
      geo_key: JSON.stringify({
        countryCode: 'PL',
        regionCode: null,
        city: 'Warsaw',
      }),
      scored_candidates: pack.scoredCandidates,
      pack,
      created_at: '2026-07-26T00:00:00.000Z',
    });
  });
});

function fixturePack(): CandidateScoringPack {
  return {
    topicId: 'topic-1',
    profile: 'default',
    language: 'en',
    geo: { countryCode: 'PL', city: 'Warsaw' },
    scoredCandidates: [{
      candidateKey: 'candidate-1',
      topicId: 'topic-1',
      label: 'Laser hair removal Warsaw',
      normalizedConcept: 'laser hair removal warsaw',
      recommendedPageType: 'local_page',
      opportunityScore: 72,
      scoreBand: 'high',
      confidence: 'medium',
      signalContributions: [],
      rationale: ['Strong local page opportunity.'],
      focusedResearchHints: [],
      warnings: [],
      degraded: false,
      sourcePackReferences: ['long-tail-pack-1'],
      ruleVersion: 'candidate-scoring-v1',
    }],
    warnings: [],
    degraded: false,
    ruleVersion: 'candidate-scoring-v1',
  };
}
