import { Module } from '@nestjs/common';
import { SeoCandidateScoringService } from './seo-candidate-scoring.service';

@Module({
  providers: [SeoCandidateScoringService],
  exports: [SeoCandidateScoringService],
})
export class SeoCandidateScoringModule {}
