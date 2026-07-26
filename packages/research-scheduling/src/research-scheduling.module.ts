import { Module } from '@nestjs/common';
import { ResearchOperationsFrontierTelemetryService } from './research-operations-frontier-telemetry.service';
import { ResearchOperationsHealthService } from './research-operations-health.service';
import { ResearchOperationsSnapshotService } from './research-operations-snapshot.service';
import { ResearchSchedulingService } from './research-scheduling.service';

@Module({
  providers: [
    ResearchOperationsFrontierTelemetryService,
    ResearchOperationsHealthService,
    ResearchOperationsSnapshotService,
    ResearchSchedulingService,
  ],
  exports: [
    ResearchOperationsFrontierTelemetryService,
    ResearchOperationsHealthService,
    ResearchOperationsSnapshotService,
    ResearchSchedulingService,
  ],
})
export class ResearchSchedulingModule {}
