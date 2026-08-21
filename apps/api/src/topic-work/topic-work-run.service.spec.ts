import { TopicWorkRunService } from './topic-work-run.service';

describe('TopicWorkRunService', () => {
  it('activates draft topics and runs bounded pipeline stages', async () => {
    const topics = {
      get: jest.fn(async () => topic('draft')),
      activate: jest.fn(async () => topic('active')),
      list: jest.fn(),
    };
    const service = makeService({ topics });

    const result = await service.runTopic({ topicId: 'topic-1', force: true });

    expect(topics.activate).toHaveBeenCalledWith('topic-1');
    expect(result.status).toBe('completed');
    expect(result.stages.map((stage) => stage.name)).toEqual([
      'topic_activation',
      'focused_serp_discovery',
      'demand_discovery',
      'topic_universe_serp_validation',
      'url_frontier_dispatch',
      'content_processing_dispatch',
      'chunking_dispatch',
      'embedding_dispatch',
      'fact_extraction_dispatch',
      'seo_pack_generation',
    ]);
  });

  it('keeps the loop alive by degrading failed stages instead of aborting', async () => {
    const service = makeService({
      serpDiscovery: {
        runFromTopic: jest.fn(async () => {
          throw new Error('provider unavailable');
        }),
      },
    });

    const result = await service.runTopic({ topicId: 'topic-1', force: true });

    expect(result.status).toBe('degraded');
    expect(result.stages.find((stage) =>
      stage.name === 'focused_serp_discovery',
    )).toEqual(expect.objectContaining({
      status: 'failed',
      message: 'provider unavailable',
    }));
    expect(result.stages.find((stage) =>
      stage.name === 'url_frontier_dispatch',
    )).toEqual(expect.objectContaining({
      status: 'completed',
    }));
  });

  it('reports degraded SERP discovery without blocking downstream stages', async () => {
    const service = makeService({
      serpDiscovery: {
        runFromTopic: jest.fn(async () => ({
          status: 'degraded_no_results',
          providerKey: 'free-fallback',
          warnings: ['No relevant organic results were found.'],
          observations: { submitted: 0, receipts: [] },
          frontier: { upsertedEntries: 0 },
        })),
      },
    });

    const result = await service.runTopic({ topicId: 'topic-1', force: true });

    expect(result.status).toBe('degraded');
    expect(result.warnings).toContain(
      'focused_serp_discovery: No relevant organic results were found.',
    );
    expect(result.stages.find((stage) =>
      stage.name === 'focused_serp_discovery',
    )).toEqual(expect.objectContaining({
      status: 'skipped',
    }));
    expect(result.stages.find((stage) =>
      stage.name === 'url_frontier_dispatch',
    )).toEqual(expect.objectContaining({
      status: 'completed',
    }));
  });

  it('uses SERP evidence without turning marketing snippets into demand queries', async () => {
    const demandDiscovery = {
      discoverAndPersist: jest.fn(async (_command: unknown) => ({
        discovery: {
          fallbackMode: false,
          warnings: [],
        },
        persistence: {
          keywordCandidates: [
            { normalizedKeyword: 'szafka do garażu z szufladami' },
          ],
          candidatePages: [
            { slug: '/szafka-do-garazu-z-szufladami/' },
          ],
        },
      })),
    };
    const db = {
      knex: jest.fn((table: string) => ({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn(async () =>
          table === 'serp_snapshots'
            ? [{
                normalized_query: 'szafka garażowa z szufladami',
                results: [],
                snapshot: {
                  query: 'szafka garażowa z szufladami',
                  results: [{
                    url: 'https://example.com/szafka',
                    title: 'Szafka do Garażu z Szufladami - Niska cena',
                    snippet: 'Szafka do Garażu z Szufladami Zróżnicowany zbiór ofert, najlepsze ceny i promocje. Wejdź i znajdź to, czego szukasz!',
                  }],
                  features: {
                    peopleAlsoAsk: [],
                    relatedSearches: [],
                    autocompleteSuggestions: [],
                  },
                },
              }]
            : []),
      })),
    };
    const service = makeService({
      db,
      demandDiscovery,
      topics: {
        get: jest.fn(async () => topic('active', 'topic-1', 'szafka garażowa z szufladami')),
        activate: jest.fn(),
        list: jest.fn(),
      },
    });

    await service.runTopic({ topicId: 'topic-1', force: true });

    const request = demandDiscovery.discoverAndPersist.mock.calls[0][0] as {
      evidenceObservations: Array<{ observedText: string }>;
    };
    expect(request.evidenceObservations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        observedText: 'Szafka do Garażu z Szufladami',
        evidenceType: 'serp_snippet',
      }),
    ]));
    expect(request.evidenceObservations.map((observation: { observedText: string }) =>
      observation.observedText,
    )).not.toEqual(expect.arrayContaining([
      'Szafka do Garażu z Szufladami Zróżnicowany zbiór ofert, najlepsze ceny i promocje. Wejdź i znajdź to, czego szukasz!',
    ]));
  });

  it('processes draft and active topics on every tick', async () => {
    const topics = {
      get: jest.fn(async (topicId: string) =>
        topic(topicId === 'draft-topic' ? 'draft' : 'active', topicId),
      ),
      activate: jest.fn(async () => topic('active', 'draft-topic')),
      list: jest.fn(async () => [
        topic('draft', 'draft-topic'),
        topic('active', 'active-topic'),
        topic('paused', 'paused-topic'),
        topic('archived', 'archived-topic'),
      ]),
    };
    const service = makeService({ topics });

    const results = await service.tick();

    expect(results.map((result) => result.topicId)).toEqual([
      'draft-topic',
      'active-topic',
    ]);
  });

  it('balances topic universe SERP validation across candidate page intents', async () => {
    const serpDiscovery = {
      runFromTopic: jest.fn(async (request?: { query?: string }) => ({
        status: 'recorded',
        providerKey: 'test',
        warnings: [],
        snapshot: {
          id: `snapshot:${request?.query ?? 'seed'}`,
          normalizedQuery: request?.query ?? 'test topic',
          results: [{ url: `https://example.com/${request?.query ?? 'seed'}` }],
        },
        observations: { submitted: 1, receipts: [] },
        frontier: { upsertedEntries: 1 },
      })),
    };
    const service = makeService({
      serpDiscovery,
      demandRepository: {
        listCandidatePages: jest.fn(async () => [
          candidatePage('test topic salon 1', 'commercial_service'),
          candidatePage('test topic salon 2', 'commercial_service'),
          candidatePage('test topic salon 3', 'commercial_service'),
          candidatePage('test topic salon 4', 'commercial_service'),
          candidatePage('test topic cena', 'price'),
          candidatePage('test topic dla mężczyzn', 'audience'),
          candidatePage('test topic czy bezpieczne', 'safety'),
          candidatePage('test topic przygotowanie', 'informational_how_to', 'guide'),
          candidatePage('test topic po zabiegu', 'informational_how_to', 'guide'),
          candidatePage('test topic vs ipl', 'comparison', 'comparison'),
          candidatePage('test topic opinie', 'commercial_service'),
        ]),
        markCandidatePagesSerpValidated: jest.fn(async () => []),
      },
    });

    const result = await service.runTopic({ topicId: 'topic-1', force: true });
    const universeStage = result.stages.find((stage) =>
      stage.name === 'topic_universe_serp_validation',
    );

    expect(universeStage).toEqual(expect.objectContaining({
      status: 'completed',
    }));
    expect((universeStage?.result as { queries: string[] }).queries).toEqual(
      expect.arrayContaining([
        'test topic cena',
        'test topic dla mężczyzn',
        'test topic czy bezpieczne',
        'test topic przygotowanie',
        'test topic po zabiegu',
        'test topic vs ipl',
        'test topic opinie',
      ]),
    );
    expect((universeStage?.result as { queries: string[] }).queries.slice(0, 7))
      .not.toEqual([
        'test topic salon 1',
        'test topic salon 2',
        'test topic salon 3',
        'test topic salon 4',
        'test topic cena',
        'test topic dla mężczyzn',
        'test topic czy bezpieczne',
      ]);
  });

  it('continues topic universe SERP validation while unvalidated candidates remain', async () => {
    const serpDiscovery = {
      runFromTopic: jest.fn(async (request?: { query?: string }) => ({
        status: 'recorded',
        providerKey: 'test',
        warnings: [],
        snapshot: {
          id: `snapshot:${request?.query ?? 'seed'}`,
          normalizedQuery: request?.query ?? 'test topic',
          results: [{ url: `https://example.com/${request?.query ?? 'seed'}` }],
        },
        observations: { submitted: 1, receipts: [] },
        frontier: { upsertedEntries: 1 },
      })),
    };
    const demandRepository = {
      listCandidatePages: jest.fn()
        .mockResolvedValueOnce([
          candidatePage('test topic cena', 'price'),
        ])
        .mockResolvedValueOnce([
          candidatePage('test topic cena', 'price'),
        ])
        .mockResolvedValueOnce([
          candidatePage('test topic przygotowanie', 'informational_how_to', 'guide'),
        ])
        .mockResolvedValueOnce([
          candidatePage('test topic przygotowanie', 'informational_how_to', 'guide'),
        ]),
      markCandidatePagesSerpValidated: jest.fn(async () => []),
    };
    const service = makeService({
      serpDiscovery,
      demandRepository,
    });

    await service.runTopic({ topicId: 'topic-1' });
    const secondRun = await service.runTopic({ topicId: 'topic-1' });
    const universeStage = secondRun.stages.find((stage) =>
      stage.name === 'topic_universe_serp_validation',
    );

    expect(universeStage).toEqual(expect.objectContaining({
      status: 'completed',
    }));
    expect(universeStage?.message).toBe(
      'Validated 1/1 generated demand queries with SERP.',
    );
    expect((universeStage?.result as { queries: string[] }).queries).toEqual([
      'test topic przygotowanie',
    ]);
  });

  it('generates SEO Packs for ready demand candidate pages', async () => {
    const seoPackGenerator = {
      generate: jest.fn((request: { candidateKey: string }) => ({
        topicId: 'topic-1',
        candidateKey: request.candidateKey,
        packKey: `topic-1:${request.candidateKey}:local_page`,
        pageType: 'local_page',
        warnings: [],
        degraded: true,
      })),
    };
    const seoPacks = {
      findLatestSeoPack: jest.fn(async (_topicId: string, candidateKey: string) =>
        candidateKey.includes('existing') ? { id: 'existing-pack' } : null,
      ),
      saveSeoPack: jest.fn(async () => ({ id: 'new-pack' })),
    };
    const service = makeService({
      demandRepository: {
        listCandidatePages: jest.fn(async () => [
          {
            ...candidatePage('test topic cena', 'price'),
            readiness: 'ready',
            evidenceTypes: ['autocomplete', 'serp_snippet'],
            evidenceUrls: ['https://example.com/price'],
          },
          {
            ...candidatePage('test topic existing', 'commercial_service'),
            readiness: 'ready',
            evidenceTypes: ['autocomplete', 'serp_snippet'],
            evidenceUrls: ['https://example.com/existing'],
          },
          {
            ...candidatePage('test topic cena salon dla kobiet', 'price_commercial_audience'),
            readiness: 'ready',
            evidenceTypes: ['autocomplete', 'serp_snippet'],
            evidenceUrls: ['https://example.com/mechanical'],
          },
          candidatePage('test topic later', 'commercial_service'),
        ]),
        markCandidatePagesSerpValidated: jest.fn(async () => []),
      },
      seoPackGenerator,
      seoPacks,
    });

    const result = await service.runTopic({ topicId: 'topic-1', force: true });
    const seoStage = result.stages.find((stage) =>
      stage.name === 'seo_pack_generation',
    );

    expect(seoStage).toEqual(expect.objectContaining({
      status: 'completed',
    }));
    expect(seoStage?.result).toEqual(expect.objectContaining({
      generated: 1,
      skippedExisting: 1,
      eligible: 2,
    }));
    expect(seoPackGenerator.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateKey: 'candidate:test-topic-cena',
        demandPack: expect.objectContaining({
          primaryKeyword: 'test topic cena',
        }),
      }),
    );
    expect(seoPacks.saveSeoPack).toHaveBeenCalledTimes(1);
  });
});

function makeService(overrides: Record<string, unknown> = {}): TopicWorkRunService {
  return new TopicWorkRunService(
    { get: jest.fn().mockReturnValue('false') } as never,
    (overrides.db ?? {
      knex: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn(async () => []),
      })),
    }) as never,
    (overrides.topics ?? {
      get: jest.fn(async () => topic('active')),
      activate: jest.fn(),
      list: jest.fn(async () => [topic('active')]),
    }) as never,
    (overrides.serpDiscovery ?? {
      runFromTopic: jest.fn(async () => ({
        status: 'recorded',
        providerKey: 'test',
        warnings: [],
        snapshot: { id: 'snapshot-1', results: [] },
        observations: { submitted: 1, receipts: [] },
        frontier: { upsertedEntries: 1 },
      })),
    }) as never,
    (overrides.demandDiscovery ?? {
      discoverAndPersist: jest.fn(async () => ({
        discovery: {
          fallbackMode: true,
          warnings: [],
        },
        persistence: {
          keywordCandidates: [
            { normalizedKeyword: 'test topic cost' },
          ],
          candidatePages: [
            { slug: '/commercial-price/' },
          ],
        },
      })),
    }) as never,
    (overrides.demandRepository ?? {
      listKeywordCandidates: jest.fn(async () => [
        { normalizedKeyword: 'test topic cost' },
      ]),
      listCandidatePages: jest.fn(async () => [
        {
          primaryKeyword: 'test topic cost',
          supportingKeywords: [],
        },
      ]),
      markCandidatePagesSerpValidated: jest.fn(async () => [
        { slug: '/commercial-price/' },
      ]),
    }) as never,
    (overrides.entityEnrichment ?? {
      enrich: jest.fn(async () => ({
        canonicalEntity: null,
        candidates: [],
        warnings: [],
      })),
    }) as never,
    {
      dispatchBatch: jest.fn(async () => ({
        requested: 10,
        dispatched: 1,
        jobIds: ['crawl-1'],
        exhausted: true,
      })),
    } as never,
    {
      dispatchPendingSuccessfulAttempts: jest.fn(async () => ({
        requested: 10,
        dispatched: 1,
        jobIds: ['processing-1'],
        exhausted: true,
      })),
    } as never,
    {
      dispatchUnchunkedDocumentVersions: jest.fn(async () => ({
        candidateCount: 1,
        chunkedCount: 1,
        alreadyChunkedCount: 0,
        results: [],
      })),
    } as never,
    {
      dispatchMissingEmbeddings: jest.fn(async () => ({
        candidateCount: 1,
        enqueuedJobCount: 1,
      })),
    } as never,
    {
      dispatchMissingFactExtraction: jest.fn(async () => ({
        candidateCount: 1,
        enqueuedJobCount: 1,
      })),
    } as never,
    (overrides.seoPackGenerator ?? {
      generate: jest.fn(() => ({
        topicId: 'topic-1',
        candidateKey: 'candidate:test-topic',
        packKey: 'topic-1:candidate:test-topic:local_page',
        pageType: 'local_page',
        warnings: [],
        degraded: true,
      })),
    }) as never,
    (overrides.seoPacks ?? {
      findLatestSeoPack: jest.fn(async () => null),
      saveSeoPack: jest.fn(async () => ({
        id: 'seo-pack-1',
      })),
    }) as never,
  );
}

function topic(status: string, id = 'topic-1', seed = 'test topic') {
  return {
    id,
    name: 'Test Topic',
    status,
    discovery: {
      search: {
        queries: [{
          text: seed,
          language: 'en',
          geo: { countryCode: 'PL' },
        }],
      },
    },
    languageGeo: {
      languages: [{ tag: 'en' }],
      geoTargets: [{ countryCode: 'PL' }],
    },
  };
}

function candidatePage(
  primaryKeyword: string,
  primaryIntent: string,
  proposedPageType = 'landing_page',
) {
  return {
    id: `page:${primaryKeyword}`,
    keywordCandidateId: `keyword:${primaryKeyword}`,
    topicId: 'topic-1',
    slug: `/${primaryKeyword.replace(/\s+/g, '-')}/`,
    primaryKeyword,
    supportingKeywords: [`${primaryKeyword} extra`],
    proposedPageType,
    confidence: 'low',
    readiness: 'not_ready',
    primaryIntent,
    clusterKey: primaryIntent,
    clusterLabel: primaryIntent,
    evidenceTypes: ['autocomplete'],
    evidenceUrls: [],
    metrics: {
      searchVolume: null,
      keywordDifficulty: null,
      cpc: null,
      trafficPotential: null,
      trend: null,
      seasonality: null,
      metricStatus: 'fallback_only',
      providerKey: 'topic_universe',
      collectedAt: null,
    },
    missingMetrics: [],
    missingResearchGaps: ['SERP validation evidence'],
    pageAction: 'new',
    createdAt: '2026-08-20T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
  };
}
