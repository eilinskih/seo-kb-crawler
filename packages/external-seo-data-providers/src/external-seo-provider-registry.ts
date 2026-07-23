import {
  ExternalSeoDataProvider,
  ExternalSeoProviderCapability,
} from './domain/external-seo-data-provider-types';
import { FallbackSeoSignalsProvider } from './fallback-seo-signals.provider';

export class ExternalSeoProviderRegistry {
  constructor(
    private readonly providers: ExternalSeoDataProvider[] = [
      new FallbackSeoSignalsProvider(),
    ],
  ) {}

  listProviders(): ExternalSeoDataProvider[] {
    return [...this.providers];
  }

  findProviders(
    capabilities: ReadonlyArray<ExternalSeoProviderCapability> = [],
  ): ExternalSeoDataProvider[] {
    if (capabilities.length === 0) {
      return this.listProviders();
    }
    return this.providers.filter((provider) =>
      capabilities.some((capability) =>
        provider.capabilities.includes(capability),
      ),
    );
  }
}
