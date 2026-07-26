import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { KnexResearchSchedulingRepository } from './persistence/knex-research-scheduling.repository';
import { ResearchOperationsFrontierTelemetryService } from './research-operations-frontier-telemetry.service';
import { ResearchOperationsHealthService } from './research-operations-health.service';
import { ResearchOperationsSnapshotService } from './research-operations-snapshot.service';
import { ResearchSchedulingService } from './research-scheduling.service';
import { RESEARCH_SCHEDULING_REPOSITORY } from './research-scheduling.tokens';

@Module({
  imports: [DbModule],
  providers: [
    KnexResearchSchedulingRepository,
    ResearchOperationsFrontierTelemetryService,
    ResearchOperationsHealthService,
    ResearchOperationsSnapshotService,
    ResearchSchedulingService,
    {
      provide: RESEARCH_SCHEDULING_REPOSITORY,
      useExisting: KnexResearchSchedulingRepository,
    },
  ],
  exports: [
    RESEARCH_SCHEDULING_REPOSITORY,
    KnexResearchSchedulingRepository,
    ResearchOperationsFrontierTelemetryService,
    ResearchOperationsHealthService,
    ResearchOperationsSnapshotService,
    ResearchSchedulingService,
  ],
})
export class ResearchSchedulingModule {}
