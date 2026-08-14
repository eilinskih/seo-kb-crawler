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
