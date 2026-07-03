import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  appConfig,
  CRAWL_QUEUE_NAME,
  redisConnectionFromUrl,
  validateEnvironment,
} from '@seo-kb/common';
import { CrawlerModule } from '@seo-kb/crawler';
import { DbModule } from '@seo-kb/db';
import { CrawlProcessor } from './crawl.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig],
      validate: validateEnvironment,
    }),
    DbModule,
    CrawlerModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: redisConnectionFromUrl(config.getOrThrow<string>('REDIS_URL')),
      }),
    }),
    BullModule.registerQueue({ name: CRAWL_QUEUE_NAME }),
  ],
  providers: [CrawlProcessor],
})
export class CrawlerWorkerModule {}
