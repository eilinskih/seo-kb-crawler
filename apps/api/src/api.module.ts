import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChunkingModule } from '@seo-kb/chunking';
import {
  appConfig,
  redisConnectionFromUrl,
  validateEnvironment,
} from '@seo-kb/common';
import { ContextPackModule } from '@seo-kb/context-pack';
import { ContentProcessingModule } from '@seo-kb/content-processing';
import { DbModule } from '@seo-kb/db';
import { DemandEngineModule } from '@seo-kb/demand-engine';
import { EmbeddingModule } from '@seo-kb/embeddings';
import { EntitiesModule } from '@seo-kb/entities';
import { ExternalEntityEnrichmentModule } from '@seo-kb/external-entity-enrichment';
import { RetrievalModule } from '@seo-kb/retrieval';
import { SeoPackModule } from '@seo-kb/seo-pack';
import {
  DuckDuckGoHtmlSerpSearchProvider,
  GoogleAutocompleteSerpFeatureProvider,
  OpenSerpSearchProvider,
  RoutedSerpSearchProvider,
  SerpIntelligenceModule,
} from '@seo-kb/serp-intelligence';
import { FactExtractionModule } from '@seo-kb/fact-extraction';
import { TopicEngineModule } from '@seo-kb/topic-engine';
import { UrlFrontierModule } from '@seo-kb/url-frontier';
import { ContentProcessingController } from './content-processing/content-processing.controller';
import { ContextPackController } from './context-pack/context-pack.controller';
import { DemandController } from './demand/demand.controller';
import { EntitiesController } from './entities/entities.controller';
import { ExternalEntityReviewController } from './external-entities/external-entity-review.controller';
import { HealthController } from './health/health.controller';
import { InfrastructureHealthService } from './health/infrastructure-health.service';
import { OperatorStatusController } from './operator/operator-status.controller';
import { SeoPackController } from './seo-pack/seo-pack.controller';
import { FocusedSerpDiscoveryController } from './serp-intelligence/focused-serp-discovery.controller';
import { FocusedSerpDiscoveryApiService } from './serp-intelligence/focused-serp-discovery.service';
import { SiteBlueprintController } from './site-blueprint/site-blueprint.controller';
import { SiteBlueprintService } from './site-blueprint/site-blueprint.service';
import { TopicWorkRunController } from './topic-work/topic-work-run.controller';
import { TopicWorkRunService } from './topic-work/topic-work-run.service';
import { TopicsController } from './topics/topics.controller';
import { UrlFrontierDispatchController } from './url-frontier/url-frontier-dispatch.controller';
import { UrlFrontierStatusController } from './url-frontier/url-frontier-status.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig],
      validate: validateEnvironment,
    }),
    DbModule,
    DemandEngineModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: redisConnectionFromUrl(config.getOrThrow<string>('REDIS_URL')),
      }),
    }),
    TopicEngineModule,
    UrlFrontierModule,
    ContentProcessingModule,
    ChunkingModule,
    EmbeddingModule,
    FactExtractionModule,
    RetrievalModule,
    SeoPackModule,
    SerpIntelligenceModule,
    ContextPackModule,
    EntitiesModule,
    ExternalEntityEnrichmentModule,
  ],
  controllers: [
    ContentProcessingController,
    ContextPackController,
    DemandController,
    EntitiesController,
    ExternalEntityReviewController,
    HealthController,
    FocusedSerpDiscoveryController,
    OperatorStatusController,
    SeoPackController,
    SiteBlueprintController,
    TopicWorkRunController,
    TopicsController,
    UrlFrontierDispatchController,
    UrlFrontierStatusController,
  ],
  providers: [
    DuckDuckGoHtmlSerpSearchProvider,
    GoogleAutocompleteSerpFeatureProvider,
    OpenSerpSearchProvider,
    RoutedSerpSearchProvider,
    InfrastructureHealthService,
    FocusedSerpDiscoveryApiService,
    SiteBlueprintService,
    TopicWorkRunService,
  ],
})
export class ApiModule {}
