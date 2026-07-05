import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  appConfig,
  CRAWL_QUEUE_NAME,
  redisConnectionFromUrl,
  validateEnvironment,
} from '@seo-kb/common';
import { ContentProcessingModule } from '@seo-kb/content-processing';
import { CrawlerModule } from '@seo-kb/crawler';
import { DbModule } from '@seo-kb/db';
import { ContentProcessingProcessor } from './content-processing.processor';
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
    ContentProcessingModule,
  ],
  providers: [ContentProcessingProcessor, CrawlProcessor],
})
export class CrawlerWorkerModule {}
