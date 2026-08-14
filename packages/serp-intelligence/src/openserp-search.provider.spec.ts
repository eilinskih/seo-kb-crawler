import { OpenSerpSearchProvider } from './openserp-search.provider';

describe('OpenSerpSearchProvider', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  it('maps OpenSERP organic results to SERP provider results', async () => {
    process.env.OPENSERP_BASE_URL = 'http://127.0.0.1:7000';
    const fetchMock = jest.fn(async (_url: string) => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        meta: {
          engines_responded: ['google'],
          engines_failed: [],
          version: '2.1',
        },
        results: [
          {
            rank: 1,
            type: 'organic',
            title: 'Depilacja laserowa Jasło',
            url: 'https://clinic.example/depilacja',
            snippet: 'Laser hair removal in Jasło.',
            position: { absolute: 1 },
          },
        ],
      }),
    }));
    global.fetch = fetchMock as never;

    const provider = new OpenSerpSearchProvider();
    const result = await provider.search({
      query: 'depilacja laserowa jasło',
      language: 'pl',
      geo: { countryCode: 'PL' },
      limit: 10,
    });

    expect(String(fetchMock.mock.calls[0][0])).toContain('/mega/search');
    expect(String(fetchMock.mock.calls[0][0])).toContain('engines=google%2Cbing');
    expect(result).toEqual({
      providerKey: 'openserp_self_host',
      providerMode: 'fallback',
      degraded: false,
      warnings: [],
      results: [{
        url: 'https://clinic.example/depilacja',
        title: 'Depilacja laserowa Jasło',
        snippet: 'Laser hair removal in Jasło.',
        position: 1,
      }],
    });
  });

  it('reports blocked or rate-limited OpenSERP responses as degraded', async () => {
    process.env.OPENSERP_BASE_URL = 'http://127.0.0.1:7000';
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({
        error: 'blocked',
        message: 'search engine blocked the request',
      }),
    })) as never;

    const provider = new OpenSerpSearchProvider();
    const result = await provider.search({
      query: 'depilacja laserowa jasło',
      limit: 10,
    });

    expect(result).toEqual({
      providerKey: 'openserp_self_host',
      providerMode: 'fallback',
      degraded: true,
      warnings: [
        'OpenSERP returned HTTP 429 blocked_or_rate_limited: search engine blocked the request',
      ],
      results: [],
    });
  });
});
