import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  appConfig,
  EMBEDDING_QUEUE_NAME,
  redisConnectionFromUrl,
  validateEnvironment,
} from '@seo-kb/common';
import { DbModule } from '@seo-kb/db';
import { EmbeddingModule } from '@seo-kb/embeddings';
import { EmbeddingProcessor } from './embedding.processor';

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
    BullModule.registerQueue({ name: EMBEDDING_QUEUE_NAME }),
    EmbeddingModule,
  ],
  providers: [EmbeddingProcessor],
})
export class EmbeddingWorkerModule {}
