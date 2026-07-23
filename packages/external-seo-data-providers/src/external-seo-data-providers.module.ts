import { Module } from '@nestjs/common';

import { ExternalSeoEnrichmentService } from './external-seo-enrichment.service';
import { ExternalSeoProviderRegistry } from './external-seo-provider-registry';

@Module({
  providers: [
    ExternalSeoProviderRegistry,
    ExternalSeoEnrichmentService,
  ],
  exports: [
    ExternalSeoProviderRegistry,
    ExternalSeoEnrichmentService,
  ],
})
export class ExternalSeoDataProvidersModule {}
