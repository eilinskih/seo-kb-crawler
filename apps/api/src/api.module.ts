import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  appConfig,
  CRAWL_QUEUE_NAME,
  redisConnectionFromUrl,
  validateEnvironment,
} from '@seo-kb/common';
import { DbModule } from '@seo-kb/db';
import { TopicEngineModule } from '@seo-kb/topic-engine';
import { HealthController } from './health/health.controller';
import { InfrastructureHealthService } from './health/infrastructure-health.service';
import { TopicsController } from './topics/topics.controller';

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
    BullModule.registerQueue({ name: CRAWL_QUEUE_NAME }),
    TopicEngineModule,
  ],
  controllers: [HealthController, TopicsController],
  providers: [InfrastructureHealthService],
})
export class ApiModule {}
