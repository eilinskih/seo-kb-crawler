import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { NoEmbeddingProvider } from './domain/no-embedding.provider';
import { EmbeddingService } from './embedding.service';
import { EMBEDDING_PROVIDER, EMBEDDING_REPOSITORY } from './embedding.tokens';
import { KnexEmbeddingRepository } from './persistence/knex-embedding.repository';

@Module({
  imports: [DbModule],
  providers: [
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
    EmbeddingService,
    KnexEmbeddingRepository,
  ],
})
export class EmbeddingModule {}
