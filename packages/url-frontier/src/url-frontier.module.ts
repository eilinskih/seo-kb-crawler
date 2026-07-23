import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CRAWL_QUEUE_NAME } from '@seo-kb/common';
import { DbModule } from '@seo-kb/db';
import { UrlFrontierCompletionService } from './application/url-frontier-completion.service';
import { UrlFrontierDispatchService } from './application/url-frontier-dispatch.service';
import { UrlFrontierStatusService } from './application/url-frontier-status.service';
import { KnexUrlFrontierRepository } from './persistence/knex-url-frontier.repository';
import { URL_FRONTIER_REPOSITORY } from './url-frontier.tokens';

@Module({
  imports: [DbModule, BullModule.registerQueue({ name: CRAWL_QUEUE_NAME })],
  providers: [
    UrlFrontierCompletionService,
    UrlFrontierDispatchService,
    UrlFrontierStatusService,
    KnexUrlFrontierRepository,
    {
      provide: URL_FRONTIER_REPOSITORY,
      useExisting: KnexUrlFrontierRepository,
    },
  ],
  exports: [
    URL_FRONTIER_REPOSITORY,
    UrlFrontierCompletionService,
    UrlFrontierDispatchService,
    UrlFrontierStatusService,
    KnexUrlFrontierRepository,
  ],
})
export class UrlFrontierModule {}
