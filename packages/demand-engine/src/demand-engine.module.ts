import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { DEMAND_ENGINE_REPOSITORY } from './demand-engine.tokens';
import { DemandDiscoveryPersistenceService } from './demand-discovery-persistence.service';
import { DemandEngineService } from './demand-engine.service';
import { DemandMetricVisibilityService } from './demand-metric-visibility.service';
import { KnexDemandEngineRepository } from './persistence/knex-demand-engine.repository';

@Module({
  imports: [DbModule],
  providers: [
    DemandDiscoveryPersistenceService,
    DemandEngineService,
    DemandMetricVisibilityService,
    KnexDemandEngineRepository,
    {
      provide: DEMAND_ENGINE_REPOSITORY,
      useExisting: KnexDemandEngineRepository,
    },
  ],
  exports: [
    DEMAND_ENGINE_REPOSITORY,
    DemandDiscoveryPersistenceService,
    DemandEngineService,
    DemandMetricVisibilityService,
    KnexDemandEngineRepository,
  ],
})
export class DemandEngineModule {}
