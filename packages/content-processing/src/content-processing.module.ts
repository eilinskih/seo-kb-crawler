import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CONTENT_PROCESSING_QUEUE_NAME } from '@seo-kb/common';
import { DbModule } from '@seo-kb/db';
import { ContentProcessingDispatchService } from './content-processing-dispatch.service';
import { ContentProcessingService } from './content-processing.service';
import { CONTENT_PROCESSING_REPOSITORY } from './content-processing.tokens';
import { KnexContentProcessingRepository } from './persistence/knex-content-processing.repository';

@Module({
  imports: [
    DbModule,
    BullModule.registerQueue({ name: CONTENT_PROCESSING_QUEUE_NAME }),
  ],
  providers: [
    ContentProcessingDispatchService,
    ContentProcessingService,
    KnexContentProcessingRepository,
    {
      provide: CONTENT_PROCESSING_REPOSITORY,
      useExisting: KnexContentProcessingRepository,
    },
  ],
  exports: [
    CONTENT_PROCESSING_REPOSITORY,
    ContentProcessingDispatchService,
    ContentProcessingService,
    KnexContentProcessingRepository,
  ],
})
export class ContentProcessingModule {}
