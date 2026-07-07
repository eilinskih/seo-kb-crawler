import { Module } from '@nestjs/common';
import { RetrievalModule } from '@seo-kb/retrieval';
import { ContextPackService } from './context-pack.service';

@Module({
  imports: [RetrievalModule],
  providers: [ContextPackService],
  exports: [ContextPackService],
})
export class ContextPackModule {}
