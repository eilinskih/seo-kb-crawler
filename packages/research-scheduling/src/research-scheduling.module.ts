import { Module } from '@nestjs/common';
import { ResearchOperationsHealthService } from './research-operations-health.service';
import { ResearchOperationsSnapshotService } from './research-operations-snapshot.service';
import { ResearchSchedulingService } from './research-scheduling.service';

@Module({
  providers: [
    ResearchOperationsHealthService,
    ResearchOperationsSnapshotService,
    ResearchSchedulingService,
  ],
  exports: [
    ResearchOperationsHealthService,
    ResearchOperationsSnapshotService,
    ResearchSchedulingService,
  ],
})
export class ResearchSchedulingModule {}
