import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  appConfig,
  redisConnectionFromUrl,
  validateEnvironment,
} from '@seo-kb/common';
import { DbModule } from '@seo-kb/db';
import { TopicEngineModule } from '@seo-kb/topic-engine';
import { UrlFrontierModule } from '@seo-kb/url-frontier';
import { HealthController } from './health/health.controller';
import { InfrastructureHealthService } from './health/infrastructure-health.service';
import { TopicsController } from './topics/topics.controller';
import { UrlFrontierDispatchController } from './url-frontier/url-frontier-dispatch.controller';

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
  ],
  controllers: [
    HealthController,
    TopicsController,
    UrlFrontierDispatchController,
  ],
  providers: [InfrastructureHealthService],
})
export class ApiModule {}
