import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { EntityScoringService } from './entity-scoring.service';
import { EvidenceAggregationService } from './evidence-aggregation.service';
import { FactScoringService } from './fact-scoring.service';
import { KnexSourceTrustRepository } from './persistence/knex-source-trust.repository';
import { SourceClassifier } from './source-classifier.service';
import { SourceTrustService } from './source-trust.service';
import { SOURCE_TRUST_REPOSITORY } from './source-trust.tokens';

@Module({
  imports: [DbModule],
  providers: [
    SourceClassifier,
    SourceTrustService,
    EvidenceAggregationService,
    FactScoringService,
    EntityScoringService,
    KnexSourceTrustRepository,
    {
      provide: SOURCE_TRUST_REPOSITORY,
      useExisting: KnexSourceTrustRepository,
    },
  ],
  exports: [
    SOURCE_TRUST_REPOSITORY,
    SourceClassifier,
    SourceTrustService,
    EvidenceAggregationService,
    FactScoringService,
    EntityScoringService,
    KnexSourceTrustRepository,
  ],
})
export class SourceTrustModule {}
