import { GoogleSearchConsoleProvider } from './google-search-console.provider';

describe('GoogleSearchConsoleProvider', () => {
  it('reports misconfigured status when credentials are missing', async () => {
    const provider = new GoogleSearchConsoleProvider({});

    await expect(provider.getStatus()).resolves.toMatchObject({
      providerKey: 'google_search_console',
      status: 'misconfigured',
      warnings: [
        expect.objectContaining({ code: 'missing_access_token' }),
        expect.objectContaining({ code: 'missing_site_url' }),
      ],
    });
    await expect(provider.enrich({ query: 'laser hair removal' })).resolves.toEqual({
      observations: [],
      warnings: [
        expect.objectContaining({ code: 'missing_access_token' }),
        expect.objectContaining({ code: 'missing_site_url' }),
      ],
    });
  });

  it('calls Search Console and normalizes owned performance metrics', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        rows: [{
          keys: ['laser hair removal cost'],
          clicks: 12,
          impressions: 240,
          ctr: 0.05,
          position: 4.2,
        }],
      }),
      text: async () => '',
    }));
    const provider = new GoogleSearchConsoleProvider({
      accessToken: 'token',
      siteUrl: 'https://example.com/',
      endpoint: 'https://example.test/sites',
      fetchImpl,
    });

    const result = await provider.enrich({
      topicId: 'topic-1',
      query: 'laser hair removal',
      market: { countryCode: 'PL' },
      language: 'en',
      now: '2026-08-05T00:00:00.000Z',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://example.test/sites/https%3A%2F%2Fexample.com%2F/searchAnalytics/query',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
        }),
      }),
    );
    expect(result.observations).toEqual([
      expect.objectContaining({
        observationType: 'keyword',
        providerKey: 'google_search_console',
        sourceCapability: 'owned_performance_data',
        subject: 'laser hair removal cost',
        confidence: 'medium',
        metrics: expect.arrayContaining([
          expect.objectContaining({
            metricName: 'traffic_potential',
            value: 12,
          }),
          expect.objectContaining({
            metricName: 'search_volume',
            value: 240,
          }),
          expect.objectContaining({
            metricName: 'trend',
            value: 0.05,
          }),
        ]),
      }),
    ]);
  });

  it('throws provider transport errors so enrichment service can fail open', async () => {
    const provider = new GoogleSearchConsoleProvider({
      accessToken: 'token',
      siteUrl: 'https://example.com/',
      fetchImpl: async () => ({
        ok: false,
        status: 403,
        json: async () => ({}),
        text: async () => 'forbidden',
      }),
    });

    await expect(provider.enrich({ query: 'laser hair removal' })).rejects.toThrow(
      'Google Search Console API returned HTTP 403: forbidden',
    );
  });
});
