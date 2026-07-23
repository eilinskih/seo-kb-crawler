import { Module } from '@nestjs/common';
import { TopicExpansionService } from './topic-expansion.service';

@Module({
  providers: [TopicExpansionService],
  exports: [TopicExpansionService],
})
export class TopicExpansionModule {}
