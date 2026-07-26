import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { KnexTopicExpansionRepository } from './persistence/knex-topic-expansion.repository';
import { TOPIC_EXPANSION_REPOSITORY } from './topic-expansion.tokens';
import { TopicExpansionService } from './topic-expansion.service';

@Module({
  imports: [DbModule],
  providers: [
    TopicExpansionService,
    KnexTopicExpansionRepository,
    {
      provide: TOPIC_EXPANSION_REPOSITORY,
      useExisting: KnexTopicExpansionRepository,
    },
  ],
  exports: [
    TOPIC_EXPANSION_REPOSITORY,
    KnexTopicExpansionRepository,
    TopicExpansionService,
  ],
})
export class TopicExpansionModule {}
