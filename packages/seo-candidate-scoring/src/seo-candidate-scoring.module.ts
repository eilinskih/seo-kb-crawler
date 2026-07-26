import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { KnexSeoCandidateScoringRepository } from './persistence/knex-seo-candidate-scoring.repository';
import { SEO_CANDIDATE_SCORING_REPOSITORY } from './seo-candidate-scoring.tokens';
import { SeoCandidateScoringService } from './seo-candidate-scoring.service';

@Module({
  imports: [DbModule],
  providers: [
    SeoCandidateScoringService,
    KnexSeoCandidateScoringRepository,
    {
      provide: SEO_CANDIDATE_SCORING_REPOSITORY,
      useExisting: KnexSeoCandidateScoringRepository,
    },
  ],
  exports: [
    SEO_CANDIDATE_SCORING_REPOSITORY,
    KnexSeoCandidateScoringRepository,
    SeoCandidateScoringService,
  ],
})
export class SeoCandidateScoringModule {}
