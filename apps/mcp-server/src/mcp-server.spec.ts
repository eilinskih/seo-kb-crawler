import { SeoKbMcpServer } from './mcp-server';

interface ApiClientStub {
  get: jest.Mock;
  post: jest.Mock;
}

describe('SeoKbMcpServer', () => {
  it('lists SEO KB tools', async () => {
    const server = new SeoKbMcpServer(apiClient() as never);

    const response = await server.handle({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    });

    expect(response).toEqual(expect.objectContaining({
      id: 1,
      result: expect.objectContaining({
        tools: expect.arrayContaining([
          expect.objectContaining({ name: 'seo_kb_create_topic' }),
          expect.objectContaining({ name: 'seo_kb_get_page_candidates' }),
        ]),
      }),
    }));
  });

  it('creates topics through the API using a simple seed argument', async () => {
    const api = apiClient({
      post: jest.fn(async (_path: string, body: unknown) => ({
        id: 'topic-1',
        body,
      })),
    });
    const server = new SeoKbMcpServer(api as never);

    const response = await server.handle({
      jsonrpc: '2.0',
      id: 'call-1',
      method: 'tools/call',
      params: {
        name: 'seo_kb_create_topic',
        arguments: {
          seed: 'depilacja laserowa jasło',
          language: 'pl',
          countryCode: 'PL',
        },
      },
    });

    expect(api.post).toHaveBeenCalledWith('/topics', expect.objectContaining({
      slug: 'depilacja-laserowa-jaslo',
    }));
    expect(response).toEqual(expect.objectContaining({
      id: 'call-1',
      result: expect.objectContaining({
        content: [expect.objectContaining({ type: 'text' })],
      }),
    }));
  });

  it('filters page candidates by readiness', async () => {
    const api = apiClient({
      get: jest.fn(async () => ({
        topicId: 'topic-1',
        summary: { candidatePageCount: 2 },
        candidatePages: [
          { slug: '/ready/', readiness: 'ready' },
          { slug: '/partial/', readiness: 'partial' },
        ],
      })),
    });
    const server = new SeoKbMcpServer(api as never);

    const response = await server.handle({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'seo_kb_get_page_candidates',
        arguments: {
          topicId: 'topic-1',
          readiness: 'ready',
        },
      },
    });

    const result = response?.result as { content: Array<{ text: string }> };
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      candidatePages: [{ slug: '/ready/' }],
    });
  });
});

function apiClient(overrides: Partial<ApiClientStub> = {}): ApiClientStub {
  return {
    get: jest.fn(),
    post: jest.fn(),
    ...overrides,
  };
}
