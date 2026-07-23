import { Module } from '@nestjs/common';
import { ResearchSchedulingService } from './research-scheduling.service';

@Module({
  providers: [ResearchSchedulingService],
  exports: [ResearchSchedulingService],
})
export class ResearchSchedulingModule {}
