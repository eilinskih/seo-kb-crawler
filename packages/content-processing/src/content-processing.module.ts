import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { ContentProcessingService } from './content-processing.service';
import { CONTENT_PROCESSING_REPOSITORY } from './content-processing.tokens';
import { KnexContentProcessingRepository } from './persistence/knex-content-processing.repository';

@Module({
  imports: [DbModule],
  providers: [
    ContentProcessingService,
    KnexContentProcessingRepository,
    {
      provide: CONTENT_PROCESSING_REPOSITORY,
      useExisting: KnexContentProcessingRepository,
    },
  ],
  exports: [
    CONTENT_PROCESSING_REPOSITORY,
    ContentProcessingService,
    KnexContentProcessingRepository,
  ],
})
export class ContentProcessingModule {}
