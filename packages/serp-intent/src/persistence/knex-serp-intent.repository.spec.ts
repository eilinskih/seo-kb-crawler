import {
  __testing,
  KnexSerpIntentRepository,
} from './knex-serp-intent.repository';
import { SerpIntentPack } from '../domain/serp-intent-types';

describe('KnexSerpIntentRepository', () => {
  it('can be constructed with the database boundary', () => {
    const repository = new KnexSerpIntentRepository({} as never);

    expect(repository).toBeInstanceOf(KnexSerpIntentRepository);
  });

  it('maps SERP Intent Packs into reusable context-keyed rows', () => {
    const pack = fixturePack();

    expect(
      __testing.toPackRow({
        pack,
        createdAt: '2026-07-26T00:00:00.000Z',
      }),
    ).toMatchObject({
      topic_id: 'topic-1',
      topic_key: 'topic-1',
      normalized_query: 'laser hair removal warsaw',
      language_key: 'en',
      geo_key: JSON.stringify({
        countryCode: 'PL',
        regionCode: null,
        city: 'Warsaw',
      }),
      source_snapshot_ids: ['snapshot-1'],
      pack,
      created_at: '2026-07-26T00:00:00.000Z',
    });
  });
});

function fixturePack(): SerpIntentPack {
  return {
    normalizedQuery: 'laser hair removal warsaw',
    topicId: 'topic-1',
    language: 'en',
    geo: { countryCode: 'PL', city: 'Warsaw' },
    sourceSnapshotIds: ['snapshot-1'],
    mustCover: [{
      intentKey: 'cost',
      label: 'Cost',
      intentClass: 'core',
      frequency: 3,
      sourceDiversity: 3,
      depth: 'moderate',
      gap: 'must_cover',
      confidence: 'high',
      supportingResults: [],
      sourceKinds: ['section'],
      evidenceTypes: ['serp_expectation'],
    }],
    recommended: [],
    opportunity: [],
    monitor: [],
    degraded: false,
    warnings: [],
    ruleVersion: 'serp-intent-v1',
  };
}
