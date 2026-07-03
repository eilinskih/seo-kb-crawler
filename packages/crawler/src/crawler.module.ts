import { Module } from '@nestjs/common';
import { CrawlJobHandler, CRAWLER_ADAPTERS } from './crawl-job.handler';
import { CrawlerAdapterSelector } from './domain/crawler-adapter-selector';
import { CrawlResultNormalizer } from './domain/crawl-result-normalizer';

@Module({
  providers: [
    CrawlerAdapterSelector,
    CrawlResultNormalizer,
    CrawlJobHandler,
    {
      provide: CRAWLER_ADAPTERS,
      useValue: [],
    },
  ],
  exports: [CrawlJobHandler, CRAWLER_ADAPTERS],
})
export class CrawlerModule {}
