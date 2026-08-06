import {
  renderOperatorConsoleHtml,
  renderOperatorTopicDetailHtml,
} from './operator-console.renderer';
import { OperatorConsoleApiClient } from './operator-console-api.client';
import { OperatorConsoleService } from './operator-console.service';
import { ExternalSeoEnrichmentService } from '@seo-kb/external-seo-data-providers';

describe('OperatorConsoleService', () => {
  it('builds an internal operator-only view model', async () => {
    const service = makeService();

    const model = await service.buildViewModel(
      new Date('2026-07-23T00:00:00.000Z'),
    );

    expect(model.generatedAt).toBe('2026-07-23T00:00:00.000Z');
    expect(model.warnings).toEqual(expect.arrayContaining([
      'Internal operator-only UI. Not a public dashboard.',
      'Content generation and publishing workflows are intentionally absent.',
    ]));
    expect(model.sections.map((section) => section.id)).toEqual([
      'topics',
      'frontier',
      'processing',
      'inspection',
      'providers',
      'research',
    ]);
    expect(model.topics).toEqual([
      expect.objectContaining({ slug: 'laser-hair-removal' }),
    ]);
    expect(model.providerStatuses).toEqual([
      expect.objectContaining({ providerKey: 'fallback_seo_signals' }),
    ]);
    expect(model.operatorStatus).toEqual(expect.objectContaining({
      retrieval: expect.objectContaining({ keywordReady: true }),
    }));
    expect(model.reviewQueues).toEqual(expect.objectContaining({
      suggestedAliases: [
        expect.objectContaining({ aliasText: 'laser removal' }),
      ],
      externalEntityIds: [
        expect.objectContaining({ externalId: 'kg:/m/test' }),
      ],
      enrichmentCandidates: [
        expect.objectContaining({ candidateName: 'Laser Hair Removal' }),
      ],
    }));
  });

  it('marks mutating actions as bounded and keeps missing read models planned', async () => {
    const service = makeService();

    const model = await service.buildViewModel();
    const actions = model.sections.flatMap((section) =>
      section.actions,
    );

    expect(actions.filter((action) => action.method !== 'GET')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'topics-pause', bounded: true }),
        expect.objectContaining({ id: 'frontier-dispatch', bounded: true }),
        expect.objectContaining({
          id: 'content-processing-dispatch',
          bounded: true,
        }),
      ]),
    );
    expect(actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'provider-status',
        enabled: false,
        owner: 'External SEO Data Providers',
      }),
    ]));
  });

  it('builds topic detail from API read models', async () => {
    const client = mockClient();
    const service = new OperatorConsoleService(
      client,
      mockExternalSeo(),
      mockAccessControl(),
      mockEntities(),
      mockExternalEntities(),
    );

    const model = await service.buildTopicDetailViewModel(
      'topic-1',
      new Date('2026-07-23T00:00:00.000Z'),
    );

    expect(client.getTopic).toHaveBeenCalledWith('topic-1');
    expect(client.getFrontierStatus).toHaveBeenCalledWith('topic-1');
    expect(model.topic).toEqual(expect.objectContaining({
      id: 'topic-1',
      name: 'Laser Hair Removal',
    }));
    expect(model.frontierStatus).toEqual(expect.objectContaining({
      topicId: null,
    }));
  });

  it('escapes rendered operator data', () => {
    const html = renderOperatorConsoleHtml({
      generatedAt: '2026-07-23T00:00:00.000Z',
      title: '<script>alert(1)</script>',
      subtitle: 'Internal',
      warnings: ['Use <safe> APIs'],
      sections: [],
      topics: [],
      providerStatuses: [],
      frontierStatus: null,
      operatorStatus: null,
      reviewQueues: emptyReviewQueues(),
      flash: null,
    });

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Use &lt;safe&gt; APIs');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('renders topic workflow forms and lifecycle actions', () => {
    const html = renderOperatorConsoleHtml({
      generatedAt: '2026-07-23T00:00:00.000Z',
      title: 'Console',
      subtitle: 'Internal',
      warnings: [],
      flash: null,
      sections: [],
      topics: [{
        id: 'topic-1',
        slug: 'laser-hair-removal',
        name: 'Laser Hair Removal',
        description: null,
        status: 'active',
        configurationVersion: 1,
        updatedAt: '2026-07-23T00:00:00.000Z',
      }],
      providerStatuses: [{
        providerKey: 'fallback_seo_signals',
        status: 'available',
        tier: 'fallback',
        capabilities: ['keyword_intelligence'],
        warnings: ['Only fallback SEO signals are available.'],
      }],
      frontierStatus: {
        topicId: null,
        totalEntries: 1,
        counts: [{ status: 'scheduled', count: 1 }],
        retryableCount: 0,
        recentEntries: [{
          id: 'frontier-1',
          topicId: 'topic-1',
          normalizedUrl: 'https://example.com/',
          crawlStatus: 'scheduled',
          relevanceDecision: 'accepted',
          priorityScore: 1,
          freshnessScore: 1,
          recrawlReason: 'initial_discovery',
          nextCrawlAt: '2026-07-23T00:00:00.000Z',
          leaseOwner: null,
          consecutiveFailures: 0,
          updatedAt: '2026-07-23T00:00:00.000Z',
        }],
      },
      operatorStatus: operatorStatusFixture(),
      reviewQueues: {
        suggestedAliases: [{
          aliasId: 'alias-1',
          entityId: 'entity-1',
          aliasText: 'laser removal',
          aliasType: 'other',
          language: 'en',
          confidence: 0.7,
          reviewStatus: 'suggested',
        }],
        externalEntityIds: [{
          packId: 'pack-1',
          entityName: 'Laser Hair Removal',
          providerKey: 'google_knowledge_graph',
          externalId: 'kg:/m/test',
          externalIdType: 'google_kg_id',
          confidence: 'medium',
          sourceUrl: 'https://example.com/entity',
          observedAt: '2026-07-23T00:00:00.000Z',
        }],
        enrichmentCandidates: [{
          packId: 'pack-1',
          entityName: 'Laser Hair Removal',
          providerKey: 'google_knowledge_graph',
          candidateName: 'Laser Hair Removal',
          externalId: 'kg:/m/test',
          externalIdType: 'google_kg_id',
          confidence: 'medium',
          sourceUrl: 'https://example.com/entity',
        }],
      },
    });

    expect(html).toContain('action="/topics"');
    expect(html).toContain('Seed keywords');
    expect(html).toContain('Laser Hair Removal');
    expect(html).toContain('href="/topics/topic-1"');
    expect(html).toContain('action="/topics/topic-1/pause"');
    expect(html).toContain('action="/topics/topic-1/configuration"');
    expect(html).toContain('Save config');
    expect(html).toContain('action="/url-frontier/dispatch"');
    expect(html).toContain('action="/content-processing/dispatch"');
    expect(html).toContain('fallback_seo_signals');
    expect(html).toContain('Only fallback SEO signals are available.');
    expect(html).toContain('URL Frontier Status');
    expect(html).toContain('https://example.com/');
    expect(html).toContain('Jobs, Failures And Readiness');
    expect(html).toContain('Content Processing');
    expect(html).toContain('keyword: ready');
    expect(html).toContain('Inspection And Health');
    expect(html).toContain('Review Queues');
    expect(html).toContain('laser removal');
    expect(html).toContain('action="/review/aliases/alias-1/approve"');
    expect(html).toContain('action="/review/aliases/alias-1/reject"');
    expect(html).toContain('kg:/m/test');
    expect(html).toContain('action="/review/external-entities/accept"');
    expect(html).toContain('action="/review/external-entities/reject"');
    expect(html).toContain('name="subjectType" value="external_id"');
    expect(html).toContain('name="subjectType" value="candidate"');
    expect(html).toContain('Recent Document');
    expect(html).toContain('Recent chunk text');
    expect(html).toContain('embedding-1');
    expect(html).toContain('local test 1');
  });

  it('renders a topic detail page with scoped frontier status', () => {
    const html = renderOperatorTopicDetailHtml({
      generatedAt: '2026-07-23T00:00:00.000Z',
      title: 'Topic: Laser Hair Removal',
      subtitle: 'Internal topic operations detail.',
      warnings: [],
      topic: {
        id: 'topic-1',
        slug: 'laser-hair-removal',
        name: 'Laser Hair Removal',
        description: 'Research topic',
        status: 'active',
        configurationVersion: 2,
        updatedAt: '2026-07-23T00:00:00.000Z',
        discovery: {
          search: {
            queries: [{ text: 'laser hair removal', language: 'en' }],
          },
          seeds: {
            urls: ['https://example.com/'],
          },
        },
        languageGeo: {
          languages: [{ tag: 'en' }],
          geoTargets: [{ countryCode: 'US' }],
        },
        crawlPolicy: {
          maxPages: 100,
        },
      },
      frontierStatus: {
        topicId: 'topic-1',
        totalEntries: 1,
        counts: [{ status: 'scheduled', count: 1 }],
        retryableCount: 0,
        recentEntries: [],
      },
    });

    expect(html).toContain('Topic: Laser Hair Removal');
    expect(html).toContain('Back to console');
    expect(html).toContain('Research topic');
    expect(html).toContain('laser hair removal');
    expect(html).toContain('https://example.com/');
    expect(html).toContain('URL Frontier Status');
    expect(html).toContain('action="/topics/topic-1/configuration"');
  });
});

function makeService(): OperatorConsoleService {
  return new OperatorConsoleService(
    mockClient(),
    mockExternalSeo(),
    mockAccessControl(),
    mockEntities(),
    mockExternalEntities(),
  );
}

function emptyReviewQueues() {
  return {
    suggestedAliases: [],
    externalEntityIds: [],
    enrichmentCandidates: [],
  };
}

function mockAccessControl() {
  return {
    status: jest.fn().mockReturnValue({
      mode: 'enforced',
      warnings: [],
    }),
  } as never;
}

function mockEntities() {
  return {
    listAliasReviewQueue: jest.fn().mockResolvedValue([{
      aliasId: 'alias-1',
      entityId: 'entity-1',
      aliasText: 'laser removal',
      aliasType: 'other',
      language: 'en',
      confidence: 0.7,
      reviewStatus: 'suggested',
    }]),
  } as never;
}

function mockExternalEntities() {
  return {
    listRecentEnrichmentPacks: jest.fn().mockResolvedValue([{
      id: 'pack-1',
      request: {
        entityName: 'Laser Hair Removal',
      },
      externalIds: [{
        providerKey: 'google_knowledge_graph',
        externalId: 'kg:/m/test',
        externalIdType: 'google_kg_id',
        confidence: 'medium',
        sourceUrl: 'https://example.com/entity',
        observedAt: '2026-07-23T00:00:00.000Z',
      }],
      candidates: [{
        providerKey: 'google_knowledge_graph',
        name: 'Laser Hair Removal',
        externalId: 'kg:/m/test',
        externalIdType: 'google_kg_id',
        confidence: 'medium',
        provenance: {
          sourceUrl: 'https://example.com/entity',
        },
      }],
    }]),
  } as never;
}

function mockClient(): OperatorConsoleApiClient {
  return {
    listTopics: jest.fn().mockResolvedValue([{
      id: 'topic-1',
      slug: 'laser-hair-removal',
      name: 'Laser Hair Removal',
      description: null,
      status: 'active',
      configurationVersion: 1,
      updatedAt: '2026-07-23T00:00:00.000Z',
    }]),
    getTopic: jest.fn().mockResolvedValue({
      id: 'topic-1',
      slug: 'laser-hair-removal',
      name: 'Laser Hair Removal',
      description: null,
      status: 'active',
      configurationVersion: 1,
      updatedAt: '2026-07-23T00:00:00.000Z',
    }),
    getFrontierStatus: jest.fn().mockResolvedValue({
      topicId: null,
      totalEntries: 0,
      counts: [],
      retryableCount: 0,
      recentEntries: [],
    }),
    getOperatorStatus: jest.fn().mockResolvedValue(operatorStatusFixture()),
    createTopic: jest.fn(),
    updateTopicConfiguration: jest.fn(),
    pauseTopic: jest.fn(),
    archiveTopic: jest.fn(),
    reactivateTopic: jest.fn(),
    dispatchUrlFrontier: jest.fn(),
    dispatchContentProcessing: jest.fn(),
    approveAlias: jest.fn(),
    rejectAlias: jest.fn(),
  } as unknown as OperatorConsoleApiClient;
}

function operatorStatusFixture() {
  return {
    contentProcessing: {
      totalRuns: 1,
      counts: [{ status: 'processed', count: 1 }],
      retryableFailures: 0,
      terminalFailures: 0,
      recentFailures: [],
    },
    chunking: {
      totalRuns: 1,
      totalChunks: 4,
      counts: [{ status: 'chunked', count: 1 }],
      retryableFailures: 0,
      terminalFailures: 0,
      recentFailures: [],
    },
    embeddings: {
      totalEmbeddings: 4,
      stats: [{
        providerKey: 'local',
        modelKey: 'test',
        modelVersion: '1',
        language: 'en',
        status: 'embedded',
        count: 4,
      }],
      retryableFailures: 0,
      terminalFailures: 0,
    },
    retrieval: {
      totalChunks: 4,
      embeddedChunks: 4,
      keywordReady: true,
      vectorReady: true,
      degradedMode: false,
    },
    inspection: {
      recentDocuments: [{
        documentId: 'document-1',
        documentVersionId: 'document-version-1',
        topicId: 'topic-1',
        requestedUrl: 'https://example.com/',
        finalUrl: null,
        title: 'Recent Document',
        wordCount: 250,
        createdAt: '2026-07-23T00:00:00.000Z',
      }],
      recentChunks: [{
        chunkId: 'chunk-1',
        topicId: 'topic-1',
        documentVersionId: 'document-version-1',
        chunkType: 'section',
        tokenCount: 42,
        language: 'en',
        textPreview: 'Recent chunk text',
        createdAt: '2026-07-23T00:00:00.000Z',
      }],
      recentEmbeddings: [{
        embeddingId: 'embedding-1',
        chunkId: 'chunk-1',
        topicId: 'topic-1',
        documentVersionId: 'document-version-1',
        providerKey: 'local',
        modelKey: 'test',
        modelVersion: '1',
        dimensions: 384,
        status: 'embedded',
        language: 'en',
        chunkType: 'section',
        embeddedAt: '2026-07-23T00:00:00.000Z',
        updatedAt: '2026-07-23T00:00:00.000Z',
      }],
    },
  };
}

function mockExternalSeo(): ExternalSeoEnrichmentService {
  return {
    enrich: jest.fn().mockResolvedValue({
      providerStatuses: [{
        providerKey: 'fallback_seo_signals',
        status: 'available',
        tier: 'fallback',
        capabilities: ['keyword_intelligence'],
      }],
      warnings: [{
        providerKey: 'fallback_seo_signals',
        message: 'Only fallback SEO signals are available.',
      }],
    }),
  } as unknown as ExternalSeoEnrichmentService;
}
