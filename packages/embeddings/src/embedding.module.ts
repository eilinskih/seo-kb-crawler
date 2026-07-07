import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EMBEDDING_QUEUE_NAME } from '@seo-kb/common';
import { DbModule } from '@seo-kb/db';
import { NoEmbeddingProvider } from './domain/no-embedding.provider';
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
      useClass: NoEmbeddingProvider,
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
