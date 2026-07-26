import {
  __testing,
  KnexTopicExpansionRepository,
} from './knex-topic-expansion.repository';
import { TopicExpansionPack } from '../domain/topic-expansion-types';

describe('KnexTopicExpansionRepository', () => {
  it('can be constructed with the database boundary', () => {
    const repository = new KnexTopicExpansionRepository({} as never);

    expect(repository).toBeInstanceOf(KnexTopicExpansionRepository);
  });

  it('maps Topic Expansion Packs into reusable topic-keyed rows', () => {
    const pack = fixturePack();

    expect(
      __testing.toPackRow({
        pack,
        createdAt: '2026-07-26T00:00:00.000Z',
      }),
    ).toMatchObject({
      topic_id: 'topic-1',
      normalized_topic_label: 'laser hair removal',
      language_key: 'en',
      geo_key: JSON.stringify({
        countryCode: 'PL',
        regionCode: null,
        city: 'Warsaw',
      }),
      source_pack_references: ['serp-pack-1', 'serp-intent-pack-1'],
      clusters: pack.clusters,
      candidates: pack.candidates,
      pack,
      created_at: '2026-07-26T00:00:00.000Z',
    });
  });
});

function fixturePack(): TopicExpansionPack {
  return {
    topicId: 'topic-1',
    normalizedTopicLabel: 'laser hair removal',
    language: 'en',
    geo: { countryCode: 'PL', city: 'Warsaw' },
    sourcePackReferences: ['serp-pack-1', 'serp-intent-pack-1'],
    clusters: [{
      clusterKey: 'cost',
      parentLabel: 'Cost',
      normalizedParent: 'cost',
      childCandidateKeys: ['candidate-1'],
      sourceSignalCounts: { serp_heading: 1 },
      confidence: 'medium',
      warnings: [],
    }],
    candidates: [{
      candidateKey: 'candidate-1',
      topicId: 'topic-1',
      candidateType: 'supporting_page',
      primaryLabel: 'Laser hair removal cost',
      normalizedConcept: 'laser hair removal cost',
      supportingLabels: [],
      signals: [],
      confidence: 'medium',
      language: 'en',
      geo: { countryCode: 'PL', city: 'Warsaw' },
      evidenceSummary: 'SERP heading evidence.',
      warnings: [],
      status: 'candidate',
    }],
    warnings: [],
    degraded: false,
    ruleVersion: 'topic-expansion-v1',
  };
}
