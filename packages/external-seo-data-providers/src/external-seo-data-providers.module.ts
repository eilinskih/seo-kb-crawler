import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DbModule } from '@seo-kb/db';

import { EXTERNAL_SEO_DATA_PROVIDER_REPOSITORY } from './external-seo-data-providers.tokens';
import { ExternalSeoEnrichmentService } from './external-seo-enrichment.service';
import { ExternalSeoProviderRefreshService } from './external-seo-provider-refresh.service';
import { configuredExternalSeoProviders } from './external-seo-provider.factory';
import { ExternalSeoProviderRegistry } from './external-seo-provider-registry';
import { KnexExternalSeoDataProviderRepository } from './persistence/knex-external-seo-data-provider.repository';

@Module({
  imports: [ConfigModule, DbModule],
  providers: [
    {
      provide: ExternalSeoProviderRegistry,
      useFactory: (config: ConfigService) =>
        new ExternalSeoProviderRegistry(configuredExternalSeoProviders(config)),
      inject: [ConfigService],
    },
    KnexExternalSeoDataProviderRepository,
    {
      provide: EXTERNAL_SEO_DATA_PROVIDER_REPOSITORY,
      useExisting: KnexExternalSeoDataProviderRepository,
    },
    {
      provide: ExternalSeoEnrichmentService,
      useFactory: (
        registry: ExternalSeoProviderRegistry,
        repository: KnexExternalSeoDataProviderRepository,
      ) => new ExternalSeoEnrichmentService(registry, repository),
      inject: [
        ExternalSeoProviderRegistry,
        EXTERNAL_SEO_DATA_PROVIDER_REPOSITORY,
      ],
    },
    {
      provide: ExternalSeoProviderRefreshService,
      useFactory: (enrichmentService: ExternalSeoEnrichmentService) =>
        new ExternalSeoProviderRefreshService(enrichmentService),
      inject: [ExternalSeoEnrichmentService],
    },
  ],
  exports: [
    EXTERNAL_SEO_DATA_PROVIDER_REPOSITORY,
    ExternalSeoProviderRegistry,
    KnexExternalSeoDataProviderRepository,
    ExternalSeoEnrichmentService,
    ExternalSeoProviderRefreshService,
  ],
})
export class ExternalSeoDataProvidersModule {}
