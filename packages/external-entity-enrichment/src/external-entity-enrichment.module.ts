import { Module } from '@nestjs/common';

import { ExternalEntityEnrichmentService } from './external-entity-enrichment.service';
import { ExternalEntityProviderRegistry } from './external-entity-provider-registry';

@Module({
  providers: [
    ExternalEntityProviderRegistry,
    ExternalEntityEnrichmentService,
  ],
  exports: [
    ExternalEntityProviderRegistry,
    ExternalEntityEnrichmentService,
  ],
})
export class ExternalEntityEnrichmentModule {}
