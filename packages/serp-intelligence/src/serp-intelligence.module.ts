import { Module } from '@nestjs/common';
import { SerpIntelligenceService } from './serp-intelligence.service';

@Module({
  providers: [SerpIntelligenceService],
  exports: [SerpIntelligenceService],
})
export class SerpIntelligenceModule {}
