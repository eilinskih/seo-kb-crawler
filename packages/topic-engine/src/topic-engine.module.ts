import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { KnexTopicRepository } from './persistence/knex-topic.repository';
import { TOPIC_REPOSITORY } from './persistence/topic.repository';
import { TopicService } from './topic.service';

@Module({
  imports: [DbModule],
  providers: [
    TopicService,
    KnexTopicRepository,
    {
      provide: TOPIC_REPOSITORY,
      useExisting: KnexTopicRepository,
    },
  ],
  exports: [TopicService],
})
export class TopicEngineModule {}
