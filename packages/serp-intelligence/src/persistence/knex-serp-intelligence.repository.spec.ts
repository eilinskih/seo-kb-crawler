import {
  __testing,
  KnexSerpIntelligenceRepository,
} from './knex-serp-intelligence.repository';
import {
  SerpPack,
  SerpSnapshot,
} from '../domain/serp-intelligence-types';

describe('KnexSerpIntelligenceRepository', () => {
  it('can be constructed with the database boundary', () => {
    const repository = new KnexSerpIntelligenceRepository({} as never);

    expect(repository).toBeInstanceOf(KnexSerpIntelligenceRepository);
  });

  it('maps snapshots and packs into reusable context-keyed rows', () => {
    const snapshot = fixtureSnapshot();
    const pack = fixturePack();

    expect(__testing.toSnapshotRow(snapshot)).toMatchObject({
      id: 'snapshot-1',
      topic_id: 'topic-1',
      topic_key: 'topic-1',
      normalized_query: 'laser hair removal warsaw',
      language_key: 'en',
      geo_key: JSON.stringify({
        countryCode: 'PL',
        regionCode: null,
        city: 'Warsaw',
      }),
      snapshot,
    });
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
      snapshot_ids: ['snapshot-1'],
      pack,
      created_at: '2026-07-26T00:00:00.000Z',
    });
  });
});

function fixtureSnapshot(): SerpSnapshot {
  return {
    id: 'snapshot-1',
    query: 'Laser Hair Removal Warsaw',
    normalizedQuery: 'laser hair removal warsaw',
    topicId: 'topic-1',
    language: 'en',
    geo: { countryCode: 'PL', city: 'Warsaw' },
    capturedAt: '2026-07-26T00:00:00.000Z',
    providerKey: 'manual',
    providerMode: 'manual_import',
    degraded: false,
    warnings: [],
    results: [{
      id: 'result-1',
      position: 1,
      url: 'https://example.com/laser-hair-removal-warsaw',
      domain: 'example.com',
      title: 'Laser Hair Removal Warsaw',
      snippet: 'Clinic landing page.',
    }],
  };
}

function fixturePack(): SerpPack {
  return {
    normalizedQuery: 'laser hair removal warsaw',
    topicId: 'topic-1',
    language: 'en',
    geo: { countryCode: 'PL', city: 'Warsaw' },
    snapshotIds: ['snapshot-1'],
    recurringHeadings: [],
    recurringFaqs: [],
    recurringEntities: [],
    dominantContentAngle: 'local',
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
    degraded: false,
    warnings: [],
    ruleVersion: 'serp-pack-v1',
  };
}
