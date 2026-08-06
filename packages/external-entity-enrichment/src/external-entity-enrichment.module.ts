import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DbModule } from '@seo-kb/db';

import { ExternalEntityEnrichmentService } from './external-entity-enrichment.service';
import { EXTERNAL_ENTITY_ENRICHMENT_REPOSITORY } from './external-entity-enrichment.tokens';
import { configuredExternalEntityExecutionPolicy } from './external-entity-execution-policy.factory';
import { configuredExternalEntityProviders } from './external-entity-provider.factory';
import { ExternalEntityProviderRegistry } from './external-entity-provider-registry';
import { KnexExternalEntityEnrichmentRepository } from './persistence/knex-external-entity-enrichment.repository';
import type { ExternalEntityEnrichmentRepository } from './persistence/external-entity-enrichment.repository';
import { ExternalEntityReviewService } from './external-entity-review.service';

@Module({
  imports: [ConfigModule, DbModule],
  providers: [
    {
      provide: ExternalEntityProviderRegistry,
      useFactory: (config: ConfigService) =>
        new ExternalEntityProviderRegistry(
          configuredExternalEntityProviders(config),
      ),
      inject: [ConfigService],
    },
    KnexExternalEntityEnrichmentRepository,
    {
      provide: EXTERNAL_ENTITY_ENRICHMENT_REPOSITORY,
      useExisting: KnexExternalEntityEnrichmentRepository,
    },
    {
      provide: ExternalEntityEnrichmentService,
      useFactory: (
        registry: ExternalEntityProviderRegistry,
        repository: ExternalEntityEnrichmentRepository,
        config: ConfigService,
      ) =>
        new ExternalEntityEnrichmentService(
          registry,
          repository,
          configuredExternalEntityExecutionPolicy(config),
        ),
      inject: [
        ExternalEntityProviderRegistry,
        EXTERNAL_ENTITY_ENRICHMENT_REPOSITORY,
        ConfigService,
      ],
    },
    {
      provide: ExternalEntityReviewService,
      useFactory: (repository: ExternalEntityEnrichmentRepository) =>
        new ExternalEntityReviewService(repository),
      inject: [EXTERNAL_ENTITY_ENRICHMENT_REPOSITORY],
    },
  ],
  exports: [
    EXTERNAL_ENTITY_ENRICHMENT_REPOSITORY,
    ExternalEntityProviderRegistry,
    KnexExternalEntityEnrichmentRepository,
    ExternalEntityEnrichmentService,
    ExternalEntityReviewService,
  ],
})
export class ExternalEntityEnrichmentModule {}
