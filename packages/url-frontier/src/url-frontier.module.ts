import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { KnexUrlFrontierRepository } from './persistence/knex-url-frontier.repository';

export const URL_FRONTIER_REPOSITORY = Symbol('URL_FRONTIER_REPOSITORY');

@Module({
  imports: [DbModule],
  providers: [
    KnexUrlFrontierRepository,
    {
      provide: URL_FRONTIER_REPOSITORY,
      useExisting: KnexUrlFrontierRepository,
    },
  ],
  exports: [URL_FRONTIER_REPOSITORY, KnexUrlFrontierRepository],
})
export class UrlFrontierModule {}
