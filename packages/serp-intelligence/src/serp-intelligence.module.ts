import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { KnexSerpIntelligenceRepository } from './persistence/knex-serp-intelligence.repository';
import { SERP_INTELLIGENCE_REPOSITORY } from './serp-intelligence.tokens';
import { FocusedSerpDiscoveryService } from './focused-serp-discovery.service';
import { SerpIntelligenceService } from './serp-intelligence.service';

@Module({
  imports: [DbModule],
  providers: [
    FocusedSerpDiscoveryService,
    SerpIntelligenceService,
    KnexSerpIntelligenceRepository,
    {
      provide: SERP_INTELLIGENCE_REPOSITORY,
      useExisting: KnexSerpIntelligenceRepository,
    },
  ],
  exports: [
    SERP_INTELLIGENCE_REPOSITORY,
    FocusedSerpDiscoveryService,
    KnexSerpIntelligenceRepository,
    SerpIntelligenceService,
  ],
})
export class SerpIntelligenceModule {}
