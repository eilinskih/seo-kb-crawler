import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { KnexSerpIntentRepository } from './persistence/knex-serp-intent.repository';
import { SERP_INTENT_REPOSITORY } from './serp-intent.tokens';
import { SerpIntentService } from './serp-intent.service';

@Module({
  imports: [DbModule],
  providers: [
    SerpIntentService,
    KnexSerpIntentRepository,
    {
      provide: SERP_INTENT_REPOSITORY,
      useExisting: KnexSerpIntentRepository,
    },
  ],
  exports: [
    SERP_INTENT_REPOSITORY,
    KnexSerpIntentRepository,
    SerpIntentService,
  ],
})
export class SerpIntentModule {}
