import { Module } from '@nestjs/common';
import { ResearchOperationsHealthService } from './research-operations-health.service';
import { ResearchSchedulingService } from './research-scheduling.service';

@Module({
  providers: [ResearchOperationsHealthService, ResearchSchedulingService],
  exports: [ResearchOperationsHealthService, ResearchSchedulingService],
})
export class ResearchSchedulingModule {}
