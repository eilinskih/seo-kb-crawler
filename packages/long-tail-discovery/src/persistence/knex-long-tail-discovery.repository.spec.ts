import {
  __testing,
  KnexLongTailDiscoveryRepository,
} from './knex-long-tail-discovery.repository';
import { LongTailDiscoveryPack } from '../domain/long-tail-discovery-types';

describe('KnexLongTailDiscoveryRepository', () => {
  it('can be constructed with the database boundary', () => {
    const repository = new KnexLongTailDiscoveryRepository({} as never);

    expect(repository).toBeInstanceOf(KnexLongTailDiscoveryRepository);
  });

  it('maps Long-tail Discovery Packs into reusable topic-keyed rows', () => {
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
      source_pack_references: ['topic-expansion-pack-1'],
      dimensions: pack.dimensions,
      combination_rules_applied: ['city-procedure'],
      opportunity_trees: pack.opportunityTrees,
      candidates: pack.candidates,
      pack,
      created_at: '2026-07-26T00:00:00.000Z',
    });
  });
});

function fixturePack(): LongTailDiscoveryPack {
  return {
    topicId: 'topic-1',
    normalizedTopicLabel: 'laser hair removal',
    language: 'en',
    geo: { countryCode: 'PL', city: 'Warsaw' },
    sourcePackReferences: ['topic-expansion-pack-1'],
    dimensions: [{
      dimensionKey: 'city:warsaw',
      dimensionType: 'city',
      label: 'Warsaw',
      normalizedValue: 'warsaw',
      sourceSignals: [],
      confidence: 'medium',
      sourceDiversity: 1,
      compatibleWith: ['procedure'],
    }],
    combinationRulesApplied: ['city-procedure'],
    opportunityTrees: [{
      treeKey: 'warsaw',
      rootLabel: 'Warsaw',
      pathLabels: ['Warsaw'],
      childCandidateKeys: ['candidate-1'],
      supportingSignalCount: 1,
      confidence: 'medium',
      warnings: [],
    }],
    candidates: [{
      candidateKey: 'candidate-1',
      topicId: 'topic-1',
      normalizedConcept: 'laser hair removal warsaw',
      displayLabel: 'Laser hair removal Warsaw',
      dimensions: [],
      sourceSignals: [],
      evidenceSummary: 'City and procedure combination.',
      metrics: {
        searchVolume: null,
        keywordDifficulty: null,
        cpc: null,
        trafficPotential: null,
        providerKey: null,
      },
      missingMetrics: ['searchVolume'],
      confidence: 'medium',
      warnings: [],
      candidatePageTypeHint: 'local_page',
      status: 'candidate',
    }],
    warnings: [],
    degraded: false,
    ruleVersion: 'long-tail-discovery-v1',
  };
}
