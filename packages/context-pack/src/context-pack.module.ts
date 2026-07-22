import { Module } from '@nestjs/common';
import { KnowledgePackModule } from '@seo-kb/knowledge-pack';
import { RetrievalModule } from '@seo-kb/retrieval';
import { ContextPackService } from './context-pack.service';

@Module({
  imports: [RetrievalModule, KnowledgePackModule],
  providers: [ContextPackService],
  exports: [ContextPackService],
})
export class ContextPackModule {}
