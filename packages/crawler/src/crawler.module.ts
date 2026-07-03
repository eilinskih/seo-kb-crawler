import { Module } from '@nestjs/common';
import { CrawlJobHandler, CRAWLER_ADAPTERS } from './crawl-job.handler';
import { CrawlerAdapterSelector } from './domain/crawler-adapter-selector';
import { CrawlResultNormalizer } from './domain/crawl-result-normalizer';
import { SafeNetworkGatewayService } from './infrastructure/safe-network-gateway.service';

@Module({
  providers: [
    CrawlerAdapterSelector,
    CrawlResultNormalizer,
    SafeNetworkGatewayService,
    CrawlJobHandler,
    {
      provide: CRAWLER_ADAPTERS,
      useValue: [],
    },
  ],
  exports: [CrawlJobHandler, CRAWLER_ADAPTERS, SafeNetworkGatewayService],
})
export class CrawlerModule {}
