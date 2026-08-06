import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { ExternalEntityEnrichmentService } from './external-entity-enrichment.service';
import { configuredExternalEntityExecutionPolicy } from './external-entity-execution-policy.factory';
import { configuredExternalEntityProviders } from './external-entity-provider.factory';
import { ExternalEntityProviderRegistry } from './external-entity-provider-registry';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: ExternalEntityProviderRegistry,
      useFactory: (config: ConfigService) =>
        new ExternalEntityProviderRegistry(
          configuredExternalEntityProviders(config),
        ),
      inject: [ConfigService],
    },
    {
      provide: ExternalEntityEnrichmentService,
      useFactory: (
        registry: ExternalEntityProviderRegistry,
        config: ConfigService,
      ) =>
        new ExternalEntityEnrichmentService(
          registry,
          undefined,
          configuredExternalEntityExecutionPolicy(config),
        ),
      inject: [ExternalEntityProviderRegistry, ConfigService],
    },
  ],
  exports: [
    ExternalEntityProviderRegistry,
    ExternalEntityEnrichmentService,
  ],
})
export class ExternalEntityEnrichmentModule {}
