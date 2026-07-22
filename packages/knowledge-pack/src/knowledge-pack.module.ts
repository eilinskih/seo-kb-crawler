import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { RetrievalModule } from '@seo-kb/retrieval';
import { KnowledgePackService } from './knowledge-pack.service';
import { KNOWLEDGE_PACK_REPOSITORY } from './knowledge-pack.tokens';
import { KnexKnowledgePackRepository } from './persistence/knex-knowledge-pack.repository';

@Module({
  imports: [DbModule, RetrievalModule],
  providers: [
    KnowledgePackService,
    KnexKnowledgePackRepository,
    {
      provide: KNOWLEDGE_PACK_REPOSITORY,
      useExisting: KnexKnowledgePackRepository,
    },
  ],
  exports: [
    KNOWLEDGE_PACK_REPOSITORY,
    KnowledgePackService,
    KnexKnowledgePackRepository,
  ],
})
export class KnowledgePackModule {}
