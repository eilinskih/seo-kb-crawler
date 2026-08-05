import { ConfigService } from '@nestjs/config';
import { ExternalSeoDataProvider } from './domain/external-seo-data-provider-types';
import { FallbackSeoSignalsProvider } from './fallback-seo-signals.provider';
import { GoogleSearchConsoleProvider } from './google-search-console.provider';

export function configuredExternalSeoProviders(
  config: Pick<ConfigService, 'get'>,
): ExternalSeoDataProvider[] {
  return [
    new FallbackSeoSignalsProvider(),
    new GoogleSearchConsoleProvider({
      accessToken: config.get<string>('GSC_ACCESS_TOKEN'),
      siteUrl: config.get<string>('GSC_SITE_URL'),
      endpoint: config.get<string>('GSC_ENDPOINT'),
      timeoutMs: numberConfig(config.get<string>('GSC_TIMEOUT_MS')),
    }),
  ];
}

function numberConfig(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
