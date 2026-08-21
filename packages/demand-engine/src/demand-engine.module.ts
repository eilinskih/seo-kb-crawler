import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { EXTERNAL_ENTITY_ENRICHMENT_QUEUE_NAME } from '@seo-kb/common';
import { DbModule } from '@seo-kb/db';
import { ExternalEntityEnrichmentModule } from '@seo-kb/external-entity-enrichment';
import {
  DemandEntityEnrichmentDispatchService,
} from './demand-entity-enrichment-queue';
import {
  DemandEntityEnrichmentWorkerService,
} from './demand-entity-enrichment-worker.service';
import { DEMAND_ENGINE_REPOSITORY } from './demand-engine.tokens';
import { DemandDiscoveryPersistenceService } from './demand-discovery-persistence.service';
import { DemandEngineService } from './demand-engine.service';
import { DemandMetricVisibilityService } from './demand-metric-visibility.service';
import { KnexDemandEngineRepository } from './persistence/knex-demand-engine.repository';

@Module({
  imports: [
    ConfigModule,
    DbModule,
    BullModule.registerQueue({ name: EXTERNAL_ENTITY_ENRICHMENT_QUEUE_NAME }),
    ExternalEntityEnrichmentModule,
  ],
  providers: [
    DemandEntityEnrichmentDispatchService,
    DemandEntityEnrichmentWorkerService,
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
    DemandEntityEnrichmentDispatchService,
    DemandEntityEnrichmentWorkerService,
    DemandDiscoveryPersistenceService,
    DemandEngineService,
    DemandMetricVisibilityService,
    KnexDemandEngineRepository,
  ],
})
export class DemandEngineModule {}
