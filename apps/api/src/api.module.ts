import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  appConfig,
  redisConnectionFromUrl,
  validateEnvironment,
} from '@seo-kb/common';
import { ContextPackModule } from '@seo-kb/context-pack';
import { ContentProcessingModule } from '@seo-kb/content-processing';
import { DbModule } from '@seo-kb/db';
import { EntitiesModule } from '@seo-kb/entities';
import { TopicEngineModule } from '@seo-kb/topic-engine';
import { UrlFrontierModule } from '@seo-kb/url-frontier';
import { ContentProcessingController } from './content-processing/content-processing.controller';
import { ContextPackController } from './context-pack/context-pack.controller';
import { EntitiesController } from './entities/entities.controller';
import { HealthController } from './health/health.controller';
import { InfrastructureHealthService } from './health/infrastructure-health.service';
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
    ContextPackModule,
    EntitiesModule,
  ],
  controllers: [
    ContentProcessingController,
    ContextPackController,
    EntitiesController,
    HealthController,
    TopicsController,
    UrlFrontierDispatchController,
    UrlFrontierStatusController,
  ],
  providers: [InfrastructureHealthService],
})
export class ApiModule {}
