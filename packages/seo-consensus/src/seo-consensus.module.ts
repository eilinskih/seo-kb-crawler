import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { ComparableValueService } from './comparable-value.service';
import { ConflictDetectionService } from './conflict-detection.service';
import { ConsensusGroupingService } from './consensus-grouping.service';
import { ContentGapHintService } from './content-gap-hint.service';
import { KnexSeoConsensusRepository } from './persistence/knex-seo-consensus.repository';
import { SeoPhrasingHintService } from './seo-phrasing-hint.service';
import { SEO_CONSENSUS_REPOSITORY } from './seo-consensus.tokens';

@Module({
  imports: [DbModule],
  providers: [
    ComparableValueService,
    ConsensusGroupingService,
    ConflictDetectionService,
    SeoPhrasingHintService,
    ContentGapHintService,
    KnexSeoConsensusRepository,
    {
      provide: SEO_CONSENSUS_REPOSITORY,
      useExisting: KnexSeoConsensusRepository,
    },
  ],
  exports: [
    SEO_CONSENSUS_REPOSITORY,
    ComparableValueService,
    ConsensusGroupingService,
    ConflictDetectionService,
    SeoPhrasingHintService,
    ContentGapHintService,
    KnexSeoConsensusRepository,
  ],
})
export class SeoConsensusModule {}
