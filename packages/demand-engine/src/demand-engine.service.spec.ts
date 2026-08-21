import { DemandEngineService } from './demand-engine.service';
import { DemandDiscoveryPersistenceService } from './demand-discovery-persistence.service';
import {
  DemandProviderAdapter,
  DemandProviderResult,
} from './domain/demand-engine-types';
import { ExternalSeoDemandProvider } from './external-seo-demand.provider';
import { ManualFallbackDemandProvider } from './manual-fallback-demand.provider';
import {
  EntityEnrichedPhraseAnalysisProvider,
  PhraseEntityEnrichmentService,
} from './phrase-analysis/entity-enriched-phrase-analysis.provider';
import { InMemoryDemandEngineRepository } from './testing/in-memory-demand-engine.repository';

describe('DemandEngineService', () => {
  it('continues in fallback mode without paid provider data', async () => {
    const service = new DemandEngineService([
      unavailableProvider(),
      new ManualFallbackDemandProvider(),
    ]);

    const result = await service.discover({
      topicSeed: 'laser hair removal',
      manualSeeds: ['Laser hair removal', 'laser hair removal price'],
      language: 'en',
      geo: { countryCode: 'PL' },
    });

    expect(result.fallbackMode).toBe(true);
    expect(result.warnings).toEqual([
      'paid_provider unavailable: missing API key',
    ]);
    expect(result.keywordCandidates[0]).toMatchObject({
      normalizedKeyword: 'laser hair removal',
      confidence: 'low',
      metrics: expect.objectContaining({
        searchVolume: null,
        keywordDifficulty: null,
        cpc: null,
        metricStatus: 'fallback_only',
      }),
    });
    expect(result.candidatePages[0]).toMatchObject({
      slug: '/laser-hair-removal/',
      primaryKeyword: 'laser hair removal',
      missingMetrics: expect.arrayContaining([
        'searchVolume',
        'keywordDifficulty',
        'cpc',
      ]),
    });
  });

  it('keeps fallback topic universe expansion limited to explicit inputs until SERP evidence exists', async () => {
    const service = new DemandEngineService();

    const result = await service.discover({
      topicSeed: 'depilacja laserowa',
      language: 'pl',
      geo: { countryCode: 'PL', city: 'Jasło' },
      manualSeeds: ['laser hair removal', 'hair removal'],
      limit: 300,
    });

    expect(result.keywordCandidates.length).toBeLessThan(25);
    expect(result.candidatePages.length).toBeLessThan(25);
    expect(result.keywordCandidates.map((candidate) =>
      candidate.normalizedKeyword,
    )).toEqual(expect.arrayContaining([
      'depilacja laserowa jasło',
      'depilacja laserowa laser hair removal',
      'hair removal depilacja laserowa',
    ]));
    expect(result.keywordCandidates.map((candidate) =>
      candidate.normalizedKeyword,
    )).not.toEqual(expect.arrayContaining([
      'depilacja laserowa cena',
      'jak przygotować się do depilacja laserowa',
      'depilacja laserowa przeciwwskazania dla mężczyzn',
    ]));
    expect(result.candidatePages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        clusterKey: 'topic:depilacja-laserowa',
        primaryIntent: 'commercial_service',
        readiness: expect.stringMatching(/partial|not_ready/),
      }),
    ]));
  });

  it('uses persisted SERP and competitor evidence as demand signals without synthetic modifiers', async () => {
    const service = new DemandEngineService();

    const result = await service.discover({
      topicSeed: 'crown coins casino',
      evidenceObservations: [
        {
          observedText: 'Crown Coins Casino Review',
          sourceTier: 'owned_data',
          providerKey: 'topic_work_evidence',
          evidenceType: 'serp_snippet',
          sourceQuery: 'crown coins casino',
          evidenceUrl: 'https://www.casino.org/us/sweepstakes-casinos/crowncoins',
        },
        {
          observedText: 'Crown Coins Casino Promo Code',
          sourceTier: 'owned_data',
          providerKey: 'topic_work_evidence',
          evidenceType: 'related_search',
          sourceQuery: 'crown coins casino',
        },
        {
          observedText: 'Is Crown Coins Casino legit?',
          sourceTier: 'owned_data',
          providerKey: 'topic_work_evidence',
          evidenceType: 'people_also_ask',
          sourceQuery: 'crown coins casino',
        },
      ],
      limit: 100,
    });

    expect(result.keywordCandidates.map((candidate) =>
      candidate.normalizedKeyword,
    )).toEqual(expect.arrayContaining([
      'crown coins casino review',
      'crown coins casino promo code',
      'is crown coins casino legit',
    ]));
    expect(result.candidatePages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        primaryKeyword: 'crown coins casino review',
        readiness: 'partial',
        evidenceTypes: expect.arrayContaining(['serp_snippet']),
      }),
    ]));
    expect(result.keywordCandidates.map((candidate) =>
      candidate.normalizedKeyword,
    )).not.toEqual(expect.arrayContaining([
      'crown coins casino pregnancy for men',
      'crown coins casino aftercare',
    ]));
  });

  it('keeps degraded SERP-only evidence partial until stronger confirmation exists', async () => {
    const service = new DemandEngineService([]);

    const result = await service.discover({
      topicSeed: 'chicken road spiel casino',
      evidenceObservations: [{
        observedText: 'Chicken Road Spiel Casino',
        sourceTier: 'owned_data',
        providerKey: 'topic_work_evidence',
        evidenceType: 'serp_snippet',
        sourceQuery: 'chicken road spiel casino',
        evidenceUrl: 'https://chickensroad.net/de',
        evidenceQuality: 'medium',
      }],
      limit: 100,
    });

    expect(result.candidatePages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        primaryKeyword: 'chicken road spiel casino',
        readiness: 'partial',
        missingResearchGaps: expect.arrayContaining([
          'Strong SERP relevance evidence',
        ]),
      }),
    ]));
  });

  it('marks SERP-backed page candidates ready only with strong evidence', async () => {
    const service = new DemandEngineService([]);

    const result = await service.discover({
      topicSeed: 'chicken road spiel casino',
      evidenceObservations: [{
        observedText: 'Chicken Road Spiel Casino',
        sourceTier: 'owned_data',
        providerKey: 'topic_work_evidence',
        evidenceType: 'serp_snippet',
        sourceQuery: 'chicken road spiel casino',
        evidenceUrl: 'https://chickensroad.net/de',
        evidenceQuality: 'strong',
      }],
      limit: 100,
    });

    expect(result.candidatePages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        primaryKeyword: 'chicken road spiel casino',
        readiness: 'ready',
      }),
    ]));
  });

  it('keeps product and model-like competitor phrases out of automatic page candidates', async () => {
    const service = new DemandEngineService();

    const result = await service.discover({
      topicSeed: 'szafka garażowa z szufladami',
      language: 'pl',
      evidenceObservations: [
        {
          observedText: 'Szafka do garażu z szufladami',
          sourceTier: 'owned_data',
          providerKey: 'topic_work_evidence',
          evidenceType: 'serp_snippet',
          sourceQuery: 'szafka garażowa z szufladami',
        },
        {
          observedText: 'Stalowa szafka z szufladami do garażu Dova 5X',
          sourceTier: 'owned_data',
          providerKey: 'topic_work_evidence',
          evidenceType: 'competitor_heading',
          sourceQuery: 'szafka garażowa z szufladami',
        },
        {
          observedText: 'Granatowa stalowa szafka z 6 szufladami L2-R61',
          sourceTier: 'owned_data',
          providerKey: 'topic_work_evidence',
          evidenceType: 'competitor_heading',
          sourceQuery: 'szafka garażowa z szufladami',
        },
        {
          observedText: 'Szafka warsztatowa garażowa z szufladą',
          sourceTier: 'owned_data',
          providerKey: 'topic_work_evidence',
          evidenceType: 'competitor_heading',
          sourceQuery: 'szafka garażowa z szufladami',
        },
      ],
      limit: 100,
    });

    expect(result.keywordCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        normalizedKeyword: 'stalowa szafka z szufladami do garażu dova 5x',
        phraseAnalysis: expect.objectContaining({
          candidateKind: 'product_or_instance',
        }),
      }),
      expect.objectContaining({
        normalizedKeyword: 'granatowa stalowa szafka z 6 szufladami l2-r61',
        phraseAnalysis: expect.objectContaining({
          candidateKind: 'product_or_instance',
        }),
      }),
    ]));
    expect(result.candidatePages.map((page) =>
      page.primaryKeyword,
    )).toEqual(expect.arrayContaining([
      'szafka do garażu z szufladami',
      'szafka warsztatowa garażowa z szufladą',
    ]));
    expect(result.candidatePages.map((page) =>
      page.primaryKeyword,
    )).not.toEqual(expect.arrayContaining([
      'stalowa szafka z szufladami do garażu dova 5x',
      'granatowa stalowa szafka z 6 szufladami l2-r61',
    ]));
  });

  it('can enrich phrase analysis with external entity evidence without requiring paid APIs', async () => {
    const service = new DemandEngineService(
      [new ManualFallbackDemandProvider()],
      new EntityEnrichedPhraseAnalysisProvider(fakeEntityEnrichment({
        'crown coins casino': [{
          name: 'Crown Coins Casino',
          externalId: 'Q-test',
          externalIdType: 'wikidata_qid',
          providerKey: 'wikidata',
          source: 'wikidata',
          types: ['online casino'],
          confidence: 'high',
          score: 120,
        }],
      })),
    );

    const result = await service.discover({
      topicSeed: 'crown coins casino',
      evidenceObservations: [{
        observedText: 'Crown Coins Casino Review',
        sourceTier: 'owned_data',
        providerKey: 'topic_work_evidence',
        evidenceType: 'related_search',
        sourceQuery: 'crown coins casino',
      }],
    });

    expect(result.keywordCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        normalizedKeyword: 'crown coins casino review',
        phraseAnalysis: expect.objectContaining({
          providerKey: 'entity_enriched_phrase_analysis',
          candidateKind: 'page_cluster',
          entityEvidence: expect.arrayContaining([
            expect.objectContaining({
              text: 'crown coins casino',
              providerKey: 'wikidata',
              externalId: 'Q-test',
            }),
          ]),
        }),
      }),
    ]));
  });

  it('does not let entity enrichment promote model-like product phrases into page candidates', async () => {
    const service = new DemandEngineService(
      [new ManualFallbackDemandProvider()],
      new EntityEnrichedPhraseAnalysisProvider(fakeEntityEnrichment({
        'dova': [{
          name: 'Dova',
          externalId: 'brand-test',
          externalIdType: 'external_entity',
          providerKey: 'google_knowledge_graph',
          source: 'google_knowledge_graph',
          types: ['Thing'],
          confidence: 'high',
          score: 200,
        }],
      })),
    );

    const result = await service.discover({
      topicSeed: 'szafka garażowa z szufladami',
      evidenceObservations: [{
        observedText: 'Stalowa szafka z szufladami do garażu Dova 5X',
        sourceTier: 'owned_data',
        providerKey: 'topic_work_evidence',
        evidenceType: 'competitor_heading',
        sourceQuery: 'szafka garażowa z szufladami',
      }],
      limit: 100,
    });

    expect(result.keywordCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        normalizedKeyword: 'stalowa szafka z szufladami do garażu dova 5x',
        phraseAnalysis: expect.objectContaining({
          providerKey: 'entity_enriched_phrase_analysis',
          candidateKind: 'product_or_instance',
        }),
      }),
    ]));
    expect(result.candidatePages.map((page) =>
      page.primaryKeyword,
    )).not.toEqual(expect.arrayContaining([
      'stalowa szafka z szufladami do garażu dova 5x',
    ]));
  });

  it('uses provider-backed metrics when available without requiring them', async () => {
    const service = new DemandEngineService([
      {
        providerKey: 'test_paid',
        sourceTier: 'paid_provider',
        async discover(): Promise<DemandProviderResult> {
          return {
            observations: [{
              observedText: 'laser hair removal cost',
              sourceTier: 'paid_provider',
              providerKey: 'test_paid',
              evidenceType: 'related_search',
              sourceQuery: 'laser hair removal',
              metrics: {
                searchVolume: 1000,
                keywordDifficulty: 22,
                cpc: 3.5,
                trafficPotential: 1200,
                metricStatus: 'provider_backed',
                collectedAt: '2026-07-23T00:00:00.000Z',
              },
            }],
          };
        },
      },
      new ManualFallbackDemandProvider(),
    ]);

    const result = await service.discover({
      topicSeed: 'laser hair removal',
    });

    expect(result.fallbackMode).toBe(false);
    expect(result.keywordCandidates[0]).toMatchObject({
      normalizedKeyword: 'laser hair removal cost',
      confidence: 'high',
      metrics: expect.objectContaining({
        searchVolume: 1000,
        metricStatus: 'provider_backed',
      }),
    });
  });

  it('discovers and persists fallback-safe demand results', async () => {
    const repository = new InMemoryDemandEngineRepository();
    const result = await new DemandDiscoveryPersistenceService(
      repository,
      [unavailableProvider(), new ManualFallbackDemandProvider()],
    ).discoverAndPersist({
      topicId: 'topic-1',
      topicSeed: 'laser hair removal',
      manualSeeds: ['laser hair removal price'],
      observedAt: '2026-07-26T00:00:00.000Z',
    });

    expect(result.discovery).toMatchObject({
      fallbackMode: true,
      warnings: ['paid_provider unavailable: missing API key'],
    });
    expect(result.persistence.keywordCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        topicId: 'topic-1',
        normalizedKeyword: 'laser hair removal',
        metrics: expect.objectContaining({
          searchVolume: null,
          metricStatus: 'fallback_only',
        }),
      }),
    ]));
    await expect(repository.listKeywordCandidates('topic-1')).resolves.not.toEqual([]);
  });

  it('maps External SEO provider metrics into provider-backed demand observations', async () => {
    const service = new DemandEngineService([
      new ExternalSeoDemandProvider({
        enrich: jest.fn(async () => ({
          request: { topicSeed: 'laser hair removal' },
          generatedAt: '2026-07-26T00:00:00.000Z',
          degraded: false,
          providerStatuses: [],
          warnings: [],
          observations: [{
            observationType: 'keyword',
            providerKey: 'test_paid',
            sourceCapability: 'keyword_intelligence',
            subject: 'laser hair removal cost',
            metrics: [
              metric('search_volume', 1000),
              metric('keyword_difficulty', 22),
              metric('cpc', 3.5),
              metric('traffic_potential', 1200),
            ],
            confidence: 'high',
            observedAt: '2026-07-26T00:00:00.000Z',
          }],
          metricSnapshots: [],
        })),
      } as never),
      new ManualFallbackDemandProvider(),
    ]);

    const result = await service.discover({
      topicSeed: 'laser hair removal',
    });

    expect(result.fallbackMode).toBe(false);
    expect(result.keywordCandidates[0]).toMatchObject({
      normalizedKeyword: 'laser hair removal cost',
      confidence: 'high',
      metrics: expect.objectContaining({
        searchVolume: 1000,
        keywordDifficulty: 22,
        cpc: 3.5,
        trafficPotential: 1200,
        metricStatus: 'provider_backed',
        providerKey: 'test_paid',
      }),
    });
  });

  it('maps External SEO fallback observations as fallback-only demand signals', async () => {
    const service = new DemandEngineService([
      new ExternalSeoDemandProvider({
        enrich: jest.fn(async () => ({
          request: { topicSeed: 'laser hair removal' },
          generatedAt: '2026-08-05T00:00:00.000Z',
          degraded: true,
          providerStatuses: [],
          warnings: [],
          observations: [{
            observationType: 'keyword',
            providerKey: 'fallback_seo_signals',
            sourceCapability: 'keyword_intelligence',
            subject: 'laser hair removal cost',
            metrics: [
              metric(
                'traffic_potential',
                null,
                'fallback_seo_signals',
                'traffic_potential',
                'unknown',
              ),
            ],
            confidence: 'low',
            observedAt: '2026-08-05T00:00:00.000Z',
          }],
          metricSnapshots: [],
        })),
      } as never),
    ]);

    const result = await service.discover({
      topicSeed: 'laser hair removal',
    });

    expect(result.fallbackMode).toBe(true);
    expect(result.keywordCandidates[0]).toMatchObject({
      sourceTiers: ['fallback'],
      metrics: expect.objectContaining({
        trafficPotential: null,
        metricStatus: 'fallback_only',
        providerKey: 'fallback_seo_signals',
      }),
    });
  });

  it('maps Google Search Console observations as owned-data-backed demand signals', async () => {
    const service = new DemandEngineService([
      new ExternalSeoDemandProvider({
        enrich: jest.fn(async () => ({
          request: { topicSeed: 'laser hair removal' },
          generatedAt: '2026-08-05T00:00:00.000Z',
          degraded: false,
          providerStatuses: [],
          warnings: [],
          observations: [{
            observationType: 'keyword',
            providerKey: 'google_search_console',
            sourceCapability: 'owned_performance_data',
            subject: 'laser hair removal cost',
            metrics: [
              metric(
                'traffic_potential',
                12,
                'google_search_console',
                'owned_performance_data',
              ),
              metric(
                'search_volume',
                240,
                'google_search_console',
                'owned_performance_data',
              ),
            ],
            confidence: 'medium',
            observedAt: '2026-08-05T00:00:00.000Z',
          }],
          metricSnapshots: [],
        })),
      } as never),
    ]);

    const result = await service.discover({
      topicSeed: 'laser hair removal',
    });

    expect(result.fallbackMode).toBe(false);
    expect(result.keywordCandidates[0]).toMatchObject({
      sourceTiers: ['owned_data'],
      metrics: expect.objectContaining({
        searchVolume: 240,
        trafficPotential: 12,
        metricStatus: 'owned_data_backed',
        providerKey: 'google_search_console',
      }),
    });
  });

  it('continues with fallback when External SEO provider returns no observations', async () => {
    const service = new DemandEngineService([
      new ExternalSeoDemandProvider({
        enrich: jest.fn(async () => ({
          request: { topicSeed: 'laser hair removal' },
          generatedAt: '2026-07-26T00:00:00.000Z',
          degraded: true,
          providerStatuses: [],
          warnings: [{
            providerKey: 'paid_provider',
            status: 'misconfigured',
            code: 'missing_api_key',
            message: 'missing API key',
          }],
          observations: [],
          metricSnapshots: [],
        })),
      } as never),
      new ManualFallbackDemandProvider(),
    ]);

    const result = await service.discover({
      topicSeed: 'laser hair removal',
      manualSeeds: ['laser hair removal price'],
    });

    expect(result.fallbackMode).toBe(true);
    expect(result.warnings).toEqual(['paid_provider: missing API key']);
    expect(result.keywordCandidates[0]).toMatchObject({
      metrics: expect.objectContaining({
        searchVolume: null,
        metricStatus: 'fallback_only',
      }),
    });
  });
});

function unavailableProvider(): DemandProviderAdapter {
  return {
    providerKey: 'paid_provider',
    sourceTier: 'paid_provider',
    async discover(): Promise<DemandProviderResult> {
      throw new Error('missing API key');
    },
  };
}

function fakeEntityEnrichment(
  candidatesByName: Record<string, Array<{
    name: string;
    externalId: string;
    externalIdType: string;
    providerKey: string;
    source: 'google_knowledge_graph' | 'wikidata' | 'schema_org' | 'other';
    types: string[];
    confidence: 'unknown' | 'low' | 'medium' | 'high';
    score: number;
  }>>,
): PhraseEntityEnrichmentService {
  return {
    async enrich(request) {
      const key = request.entityName.toLowerCase();
      const candidates = candidatesByName[key] ?? [];
      return {
        request,
        generatedAt: '2026-08-21T00:00:00.000Z',
        degraded: candidates.length === 0,
        providerStatuses: [],
        warnings: [],
        candidates: candidates.map((candidate) => ({
          providerKey: candidate.providerKey,
          source: candidate.source,
          externalId: candidate.externalId,
          externalIdType: candidate.externalIdType,
          name: candidate.name,
          description: null,
          types: candidate.types,
          aliases: [],
          urls: [],
          score: candidate.score,
          confidence: candidate.confidence,
          provenance: {
            providerKey: candidate.providerKey,
            source: candidate.source,
            observedAt: '2026-08-21T00:00:00.000Z',
          },
        })),
        externalIds: [],
      };
    },
  };
}

function metric(
  metricName: string,
  value: number | string | null,
  providerKey = 'test_paid',
  sourceCapability = 'keyword_intelligence',
  confidence = 'high',
) {
  return {
    metricName,
    value,
    providerKey,
    sourceCapability,
    fetchedAt: '2026-07-26T00:00:00.000Z',
    confidence,
    warningCodes: [],
  };
}
