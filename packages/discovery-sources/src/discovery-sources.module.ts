import { Module } from '@nestjs/common';
import { DiscoveryPlanner } from './domain/discovery-planner';

@Module({
  providers: [DiscoveryPlanner],
  exports: [DiscoveryPlanner],
})
export class DiscoverySourcesModule {}
