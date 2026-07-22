import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  appConfig,
  FACT_EXTRACTION_QUEUE_NAME,
  redisConnectionFromUrl,
  validateEnvironment,
} from '@seo-kb/common';
import { DbModule } from '@seo-kb/db';
import { FactExtractionModule } from '@seo-kb/fact-extraction';
import { FactExtractionProcessor } from './fact-extraction.processor';

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
        connection: redisConnectionFromUrl(
          config.getOrThrow<string>('REDIS_URL'),
        ),
      }),
    }),
    BullModule.registerQueue({ name: FACT_EXTRACTION_QUEUE_NAME }),
    FactExtractionModule,
  ],
  providers: [FactExtractionProcessor],
})
export class FactExtractionWorkerModule {}
