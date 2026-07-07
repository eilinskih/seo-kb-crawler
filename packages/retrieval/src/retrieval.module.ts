import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { KnexRetrievalRepository } from './persistence/knex-retrieval.repository';
import { RetrievalService } from './retrieval.service';
import { RETRIEVAL_REPOSITORY } from './retrieval.tokens';

@Module({
  imports: [DbModule],
  providers: [
    RetrievalService,
    KnexRetrievalRepository,
    {
      provide: RETRIEVAL_REPOSITORY,
      useExisting: KnexRetrievalRepository,
    },
  ],
  exports: [RETRIEVAL_REPOSITORY, RetrievalService],
})
export class RetrievalModule {}
