import { GoogleAutocompleteSerpFeatureProvider } from './google-autocomplete-serp-feature.provider';

describe('GoogleAutocompleteSerpFeatureProvider', () => {
  const originalFetch = global.fetch;
  const originalEnabled = process.env.GOOGLE_AUTOCOMPLETE_ENABLED;

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalEnabled === undefined) {
      delete process.env.GOOGLE_AUTOCOMPLETE_ENABLED;
    } else {
      process.env.GOOGLE_AUTOCOMPLETE_ENABLED = originalEnabled;
    }
  });

  it('collects Google autocomplete suggestions as feature-only SERP evidence', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify([
        'chicken road spiel casino',
        [
          'chicken road spiel casino demo',
          'chicken road spiel casino bonus',
          'chicken road spiel casino',
        ],
      ]),
    })) as never;

    const provider = new GoogleAutocompleteSerpFeatureProvider();
    const result = await provider.search({
      query: 'chicken road spiel casino',
      language: 'de',
      geo: { countryCode: 'DE' },
      limit: 10,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('suggestqueries.google.com'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'accept-language': 'de,en;q=0.8',
        }),
      }),
    );
    expect(result).toEqual(expect.objectContaining({
      providerKey: 'google_autocomplete',
      providerMode: 'fallback',
      degraded: false,
      results: [],
      features: {
        autocompleteSuggestions: [
          'chicken road spiel casino demo',
          'chicken road spiel casino bonus',
          'chicken road spiel casino',
        ],
      },
    }));
  });

  it('can be disabled for deterministic offline environments', async () => {
    process.env.GOOGLE_AUTOCOMPLETE_ENABLED = 'false';
    global.fetch = jest.fn() as never;

    const provider = new GoogleAutocompleteSerpFeatureProvider();
    const result = await provider.search({
      query: 'depilacja laserowa jasło',
      limit: 10,
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
      degraded: true,
      warnings: ['Google autocomplete provider is disabled.'],
      results: [],
    }));
  });
});
