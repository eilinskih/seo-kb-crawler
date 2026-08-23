import { RoutedSerpSearchProvider } from './routed-serp-search.provider';

describe('RoutedSerpSearchProvider', () => {
  it('uses OpenSERP results when configured and available', async () => {
    const openSerp = {
      isConfigured: () => true,
      search: jest.fn(async () => ({
        providerKey: 'openserp_self_host',
        providerMode: 'fallback',
        degraded: false,
        warnings: [],
        results: [{ url: 'https://clinic.example/', position: 1 }],
      })),
    };
    const htmlFallback = { search: jest.fn() };

    const provider = new RoutedSerpSearchProvider(openSerp as never, htmlFallback as never);
    const result = await provider.search({ query: 'depilacja laserowa jasło', limit: 10 });

    expect(result.providerKey).toBe('openserp_self_host');
    expect(htmlFallback.search).not.toHaveBeenCalled();
  });

  it('enriches available SERP results with Google autocomplete suggestions', async () => {
    const openSerp = {
      isConfigured: () => true,
      search: jest.fn(async () => ({
        providerKey: 'openserp_self_host',
        providerMode: 'fallback',
        degraded: false,
        warnings: [],
        results: [{ url: 'https://casino.example/', position: 1 }],
        features: { relatedSearches: ['chicken road bonus'] },
      })),
    };
    const htmlFallback = { search: jest.fn() };
    const autocomplete = {
      search: jest.fn(async () => ({
        providerKey: 'google_autocomplete',
        providerMode: 'fallback',
        degraded: false,
        warnings: [],
        results: [],
        features: {
          autocompleteSuggestions: ['chicken road demo'],
        },
      })),
    };

    const provider = new RoutedSerpSearchProvider(
      openSerp as never,
      htmlFallback as never,
      autocomplete as never,
    );
    const result = await provider.search({ query: 'chicken road', limit: 10 });

    expect(result.results).toEqual([{ url: 'https://casino.example/', position: 1 }]);
    expect(result.features).toEqual({
      peopleAlsoAsk: [],
      relatedSearches: ['chicken road bonus'],
      autocompleteSuggestions: ['chicken road demo'],
    });
  });

  it('returns feature-only evidence when organic fallbacks have no URLs', async () => {
    const openSerp = {
      isConfigured: () => true,
      search: jest.fn(async () => ({
        providerKey: 'openserp_self_host',
        providerMode: 'fallback',
        degraded: true,
        warnings: ['OpenSERP returned no organic result URLs.'],
        results: [],
      })),
    };
    const htmlFallback = {
      search: jest.fn(async () => ({
        providerKey: 'free_html_serp_fallback',
        providerMode: 'fallback',
        degraded: true,
        warnings: ['HTML fallback returned no organic result URLs.'],
        results: [],
      })),
    };
    const autocomplete = {
      search: jest.fn(async () => ({
        providerKey: 'google_autocomplete',
        providerMode: 'fallback',
        degraded: false,
        warnings: [],
        results: [],
        features: {
          autocompleteSuggestions: ['podnośnik hydrauliczny żaba'],
        },
      })),
    };

    const provider = new RoutedSerpSearchProvider(
      openSerp as never,
      htmlFallback as never,
      autocomplete as never,
    );
    const result = await provider.search({ query: 'podnośnik hydrauliczny', limit: 10 });

    expect(result.results).toEqual([]);
    expect(result.features?.autocompleteSuggestions).toEqual([
      'podnośnik hydrauliczny żaba',
    ]);
    expect(result.warnings).toEqual([
      'OpenSERP returned no organic result URLs.',
      'HTML fallback returned no organic result URLs.',
    ]);
  });

  it('falls back to HTML sources when OpenSERP is unavailable', async () => {
    const openSerp = {
      isConfigured: () => true,
      search: jest.fn(async () => ({
        providerKey: 'openserp_self_host',
        providerMode: 'fallback',
        degraded: true,
        warnings: ['OpenSERP returned HTTP 429 blocked_or_rate_limited'],
        results: [],
      })),
    };
    const htmlFallback = {
      search: jest.fn(async () => ({
        providerKey: 'free_html_serp_fallback',
        providerMode: 'fallback',
        degraded: false,
        warnings: [],
        results: [{ url: 'https://clinic.example/', position: 1 }],
      })),
    };

    const provider = new RoutedSerpSearchProvider(openSerp as never, htmlFallback as never);
    const result = await provider.search({ query: 'depilacja laserowa jasło', limit: 10 });

    expect(result).toEqual({
      providerKey: 'free_html_serp_fallback',
      providerMode: 'fallback',
      degraded: true,
      warnings: ['OpenSERP returned HTTP 429 blocked_or_rate_limited'],
      results: [{ url: 'https://clinic.example/', position: 1 }],
    });
  });
});
