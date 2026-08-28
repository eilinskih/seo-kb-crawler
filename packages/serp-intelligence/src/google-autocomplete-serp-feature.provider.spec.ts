import {
  autocompleteProbeQueries,
  GoogleAutocompleteSerpFeatureProvider,
} from './google-autocomplete-serp-feature.provider';

describe('GoogleAutocompleteSerpFeatureProvider', () => {
  const originalFetch = global.fetch;
  const originalEnabled = process.env.GOOGLE_AUTOCOMPLETE_ENABLED;
  const originalMaxProbes = process.env.GOOGLE_AUTOCOMPLETE_MAX_PROBES;
  const originalMaxSuggestions = process.env.GOOGLE_AUTOCOMPLETE_MAX_SUGGESTIONS;

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalEnabled === undefined) {
      delete process.env.GOOGLE_AUTOCOMPLETE_ENABLED;
    } else {
      process.env.GOOGLE_AUTOCOMPLETE_ENABLED = originalEnabled;
    }
    if (originalMaxProbes === undefined) {
      delete process.env.GOOGLE_AUTOCOMPLETE_MAX_PROBES;
    } else {
      process.env.GOOGLE_AUTOCOMPLETE_MAX_PROBES = originalMaxProbes;
    }
    if (originalMaxSuggestions === undefined) {
      delete process.env.GOOGLE_AUTOCOMPLETE_MAX_SUGGESTIONS;
    } else {
      process.env.GOOGLE_AUTOCOMPLETE_MAX_SUGGESTIONS = originalMaxSuggestions;
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

  it('probes language-aware intent modifiers and alphabet expansions up to a limit', () => {
    process.env.GOOGLE_AUTOCOMPLETE_MAX_PROBES = '8';

    expect(autocompleteProbeQueries({
      query: 'chicken road',
      language: 'de',
    })).toEqual([
      'chicken road',
      'chicken road casino',
      'chicken road demo',
      'chicken road bonus',
      'chicken road app',
      'chicken road erfahrungen',
      'chicken road seriös',
      'chicken road echtgeld',
    ]);
  });

  it('merges suggestions across probes and filters unrelated suggestions', async () => {
    process.env.GOOGLE_AUTOCOMPLETE_MAX_PROBES = '3';
    global.fetch = jest.fn(async (url: string) => ({
      ok: true,
      text: async () => JSON.stringify([
        new URL(url).searchParams.get('q'),
        [
          'chicken road casino',
          'unrelated weather forecast',
          'chicken road demo',
        ],
      ]),
    })) as never;

    const provider = new GoogleAutocompleteSerpFeatureProvider();
    const result = await provider.search({
      query: 'chicken road',
      language: 'de',
      geo: { countryCode: 'DE' },
      limit: 10,
    });

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(result.features?.autocompleteSuggestions).toEqual([
      'chicken road casino',
      'chicken road demo',
    ]);
  });

  it('filters noisy autocomplete artifacts before they enter demand evidence', async () => {
    process.env.GOOGLE_AUTOCOMPLETE_MAX_PROBES = '1';
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify([
        'chicken road casino',
        [
          'chicken road casino review',
          'chicken road 🇩 🇪 casinod casino',
          'chicken road casino 🎲 www scommesse casino',
          'chicken road casino login app download free android extra',
        ],
      ]),
    })) as never;

    const provider = new GoogleAutocompleteSerpFeatureProvider();
    const result = await provider.search({
      query: 'chicken road casino',
      language: 'de',
      geo: { countryCode: 'DE' },
      limit: 10,
    });

    expect(result.features?.autocompleteSuggestions).toEqual([
      'chicken road casino review',
    ]);
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
