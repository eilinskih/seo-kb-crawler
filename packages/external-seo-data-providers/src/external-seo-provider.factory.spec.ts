import { configuredExternalSeoProviders } from './external-seo-provider.factory';
import { FallbackSeoSignalsProvider } from './fallback-seo-signals.provider';
import { GoogleSearchConsoleProvider } from './google-search-console.provider';

describe('configuredExternalSeoProviders', () => {
  it('keeps fallback and registers Google Search Console as optional owned data', () => {
    const providers = configuredExternalSeoProviders({
      get: (key: string) =>
        ({
          GSC_ACCESS_TOKEN: 'token',
          GSC_SITE_URL: 'https://example.com/',
        })[key],
    });

    expect(providers[0]).toBeInstanceOf(FallbackSeoSignalsProvider);
    expect(providers[1]).toBeInstanceOf(GoogleSearchConsoleProvider);
  });

  it('does not require Google Search Console credentials to build providers', async () => {
    const providers = configuredExternalSeoProviders({
      get: () => undefined,
    });

    expect(providers).toHaveLength(2);
    await expect(providers[1].getStatus()).resolves.toMatchObject({
      providerKey: 'google_search_console',
      status: 'misconfigured',
    });
  });
});
