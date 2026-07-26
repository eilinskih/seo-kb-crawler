import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { DEMAND_ENGINE_REPOSITORY } from './demand-engine.tokens';
import { DemandEngineService } from './demand-engine.service';
import { KnexDemandEngineRepository } from './persistence/knex-demand-engine.repository';

@Module({
  imports: [DbModule],
  providers: [
    DemandEngineService,
    KnexDemandEngineRepository,
    {
      provide: DEMAND_ENGINE_REPOSITORY,
      useExisting: KnexDemandEngineRepository,
    },
  ],
  exports: [
    DEMAND_ENGINE_REPOSITORY,
    DemandEngineService,
    KnexDemandEngineRepository,
  ],
})
export class DemandEngineModule {}
