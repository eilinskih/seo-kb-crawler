import { renderOperatorConsoleHtml } from './operator-console.renderer';
import { OperatorConsoleApiClient } from './operator-console-api.client';
import { OperatorConsoleService } from './operator-console.service';
import { ExternalSeoEnrichmentService } from '@seo-kb/external-seo-data-providers';

describe('OperatorConsoleService', () => {
  it('builds an internal operator-only view model', async () => {
    const service = new OperatorConsoleService(mockClient(), mockExternalSeo());

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
  });

  it('marks mutating actions as bounded and keeps missing read models planned', async () => {
    const service = new OperatorConsoleService(mockClient(), mockExternalSeo());

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
          nextCrawlAt: '2026-07-23T00:00:00.000Z',
          leaseOwner: null,
          consecutiveFailures: 0,
          updatedAt: '2026-07-23T00:00:00.000Z',
        }],
      },
      operatorStatus: operatorStatusFixture(),
    });

    expect(html).toContain('action="/topics"');
    expect(html).toContain('Seed keywords');
    expect(html).toContain('Laser Hair Removal');
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
  });
});

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
