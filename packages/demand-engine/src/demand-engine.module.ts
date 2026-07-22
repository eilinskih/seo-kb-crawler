import { Module } from '@nestjs/common';
import { DemandEngineService } from './demand-engine.service';

@Module({
  providers: [DemandEngineService],
  exports: [DemandEngineService],
})
export class DemandEngineModule {}
