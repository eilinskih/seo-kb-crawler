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
import { EmbeddingModule } from '@seo-kb/embeddings';
import { EntitiesModule } from '@seo-kb/entities';
import { ExternalEntityEnrichmentModule } from '@seo-kb/external-entity-enrichment';
import { RetrievalModule } from '@seo-kb/retrieval';
import {
  DuckDuckGoHtmlSerpSearchProvider,
  SerpIntelligenceModule,
} from '@seo-kb/serp-intelligence';
import { FactExtractionModule } from '@seo-kb/fact-extraction';
import { TopicEngineModule } from '@seo-kb/topic-engine';
import { UrlFrontierModule } from '@seo-kb/url-frontier';
import { ContentProcessingController } from './content-processing/content-processing.controller';
import { ContextPackController } from './context-pack/context-pack.controller';
import { EntitiesController } from './entities/entities.controller';
import { ExternalEntityReviewController } from './external-entities/external-entity-review.controller';
import { HealthController } from './health/health.controller';
import { InfrastructureHealthService } from './health/infrastructure-health.service';
import { OperatorStatusController } from './operator/operator-status.controller';
import { FocusedSerpDiscoveryController } from './serp-intelligence/focused-serp-discovery.controller';
import { FocusedSerpDiscoveryApiService } from './serp-intelligence/focused-serp-discovery.service';
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
    SerpIntelligenceModule,
    ContextPackModule,
    EntitiesModule,
    ExternalEntityEnrichmentModule,
  ],
  controllers: [
    ContentProcessingController,
    ContextPackController,
    EntitiesController,
    ExternalEntityReviewController,
    HealthController,
    FocusedSerpDiscoveryController,
    OperatorStatusController,
    TopicWorkRunController,
    TopicsController,
    UrlFrontierDispatchController,
    UrlFrontierStatusController,
  ],
  providers: [
    DuckDuckGoHtmlSerpSearchProvider,
    InfrastructureHealthService,
    FocusedSerpDiscoveryApiService,
    TopicWorkRunService,
  ],
})
export class ApiModule {}
