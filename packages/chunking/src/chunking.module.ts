import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { ChunkingService } from './chunking.service';
import { CHUNKING_REPOSITORY } from './chunking.tokens';
import { KnexChunkingRepository } from './persistence/knex-chunking.repository';

@Module({
  imports: [DbModule],
  providers: [
    ChunkingService,
    KnexChunkingRepository,
    {
      provide: CHUNKING_REPOSITORY,
      useExisting: KnexChunkingRepository,
    },
  ],
  exports: [CHUNKING_REPOSITORY, ChunkingService, KnexChunkingRepository],
})
export class ChunkingModule {}
