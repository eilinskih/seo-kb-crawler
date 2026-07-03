import { Module } from '@nestjs/common';
import { CrawlJobHandler, CRAWLER_ADAPTERS } from './crawl-job.handler';
import { CrawlerAdapterSelector } from './domain/crawler-adapter-selector';
import { CrawlResultNormalizer } from './domain/crawl-result-normalizer';
import { RobotsPolicyService } from './infrastructure/robots-policy.service';
import { SafeNetworkGatewayService } from './infrastructure/safe-network-gateway.service';

@Module({
  providers: [
    CrawlerAdapterSelector,
    CrawlResultNormalizer,
    SafeNetworkGatewayService,
    RobotsPolicyService,
    CrawlJobHandler,
    {
      provide: CRAWLER_ADAPTERS,
      useValue: [],
    },
  ],
  exports: [
    CrawlJobHandler,
    CRAWLER_ADAPTERS,
    SafeNetworkGatewayService,
    RobotsPolicyService,
  ],
})
export class CrawlerModule {}
