import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { ChunkingDispatchService } from './chunking-dispatch.service';
import { ChunkingService } from './chunking.service';
import { CHUNKING_REPOSITORY } from './chunking.tokens';
import { KnexChunkingRepository } from './persistence/knex-chunking.repository';

@Module({
  imports: [DbModule],
  providers: [
    ChunkingDispatchService,
    ChunkingService,
    KnexChunkingRepository,
    {
      provide: CHUNKING_REPOSITORY,
      useExisting: KnexChunkingRepository,
    },
  ],
  exports: [
    CHUNKING_REPOSITORY,
    ChunkingDispatchService,
    ChunkingService,
    KnexChunkingRepository,
  ],
})
export class ChunkingModule {}
