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
});

function makeService(overrides: Record<string, unknown> = {}): TopicWorkRunService {
  return new TopicWorkRunService(
    { get: jest.fn().mockReturnValue('false') } as never,
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

function topic(status: string, id = 'topic-1') {
  return {
    id,
    name: 'Test Topic',
    status,
    discovery: {
      search: {
        queries: [{
          text: 'test topic',
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
