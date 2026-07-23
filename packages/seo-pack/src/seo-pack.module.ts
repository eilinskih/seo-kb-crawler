import { Module } from '@nestjs/common';
import { SeoPackGeneratorService } from './seo-pack-generator.service';
import { SeoPackService } from './seo-pack.service';

@Module({
  providers: [SeoPackGeneratorService, SeoPackService],
  exports: [SeoPackGeneratorService, SeoPackService],
})
export class SeoPackModule {}
