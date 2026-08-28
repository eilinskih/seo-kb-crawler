import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { EMBEDDING_QUEUE_NAME } from '@seo-kb/common';
import { DbModule } from '@seo-kb/db';
import { NoEmbeddingProvider } from './domain/no-embedding.provider';
import { OllamaEmbeddingProvider } from './domain/ollama-embedding.provider';
import { EmbeddingDispatchService } from './embedding-dispatch.service';
import { EmbeddingService } from './embedding.service';
import { EMBEDDING_PROVIDER, EMBEDDING_REPOSITORY } from './embedding.tokens';
import { KnexEmbeddingRepository } from './persistence/knex-embedding.repository';

@Module({
  imports: [DbModule, BullModule.registerQueue({ name: EMBEDDING_QUEUE_NAME })],
  providers: [
    EmbeddingDispatchService,
    EmbeddingService,
    KnexEmbeddingRepository,
    {
      provide: EMBEDDING_REPOSITORY,
      useExisting: KnexEmbeddingRepository,
    },
    {
      provide: EMBEDDING_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        if (config.get<string>('EMBEDDING_PROVIDER') === 'ollama') {
          return new OllamaEmbeddingProvider({
            baseUrl: config.get<string>('OLLAMA_BASE_URL') ??
              'http://127.0.0.1:11434',
            model: config.get<string>('OLLAMA_EMBEDDING_MODEL') ?? 'bge-m3',
            modelVersion: config.get<string>('OLLAMA_EMBEDDING_MODEL_VERSION') ??
              'local',
            dimensions: positiveInteger(
              config.get<string>('OLLAMA_EMBEDDING_DIMENSIONS'),
              1024,
            ),
          });
        }
        return new NoEmbeddingProvider();
      },
    },
  ],
  exports: [
    EMBEDDING_PROVIDER,
    EMBEDDING_REPOSITORY,
    EmbeddingDispatchService,
    EmbeddingService,
    KnexEmbeddingRepository,
  ],
})
export class EmbeddingModule {}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = value ? Number(value) : fallback;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
