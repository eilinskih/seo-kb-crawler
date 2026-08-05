import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';

import { EXTERNAL_SEO_DATA_PROVIDER_REPOSITORY } from './external-seo-data-providers.tokens';
import { ExternalSeoEnrichmentService } from './external-seo-enrichment.service';
import { ExternalSeoProviderRegistry } from './external-seo-provider-registry';
import { KnexExternalSeoDataProviderRepository } from './persistence/knex-external-seo-data-provider.repository';

@Module({
  imports: [DbModule],
  providers: [
    ExternalSeoProviderRegistry,
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
  ],
  exports: [
    EXTERNAL_SEO_DATA_PROVIDER_REPOSITORY,
    ExternalSeoProviderRegistry,
    KnexExternalSeoDataProviderRepository,
    ExternalSeoEnrichmentService,
  ],
})
export class ExternalSeoDataProvidersModule {}
