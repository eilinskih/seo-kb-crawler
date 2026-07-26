import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { KnexSeoPackRepository } from './persistence/knex-seo-pack.repository';
import { SeoPackGeneratorService } from './seo-pack-generator.service';
import { SeoPackService } from './seo-pack.service';
import { SEO_PACK_REPOSITORY } from './seo-pack.tokens';

@Module({
  imports: [DbModule],
  providers: [
    SeoPackGeneratorService,
    SeoPackService,
    KnexSeoPackRepository,
    {
      provide: SEO_PACK_REPOSITORY,
      useExisting: KnexSeoPackRepository,
    },
  ],
  exports: [
    SEO_PACK_REPOSITORY,
    KnexSeoPackRepository,
    SeoPackGeneratorService,
    SeoPackService,
  ],
})
export class SeoPackModule {}
