import { Module } from '@nestjs/common';
import { CrawlExecutionWrapper } from './crawl-execution-wrapper';
import { CrawlJobHandler, CRAWLER_ADAPTERS } from './crawl-job.handler';
import { CrawlerAdapterSelector } from './domain/crawler-adapter-selector';
import { CrawlResultNormalizer } from './domain/crawl-result-normalizer';
import { HttpFetchAdapter } from './infrastructure/http-fetch-adapter';
import { RobotsPolicyService } from './infrastructure/robots-policy.service';
import { SafeNetworkGatewayService } from './infrastructure/safe-network-gateway.service';

@Module({
  providers: [
    CrawlerAdapterSelector,
    CrawlResultNormalizer,
    SafeNetworkGatewayService,
    RobotsPolicyService,
    CrawlExecutionWrapper,
    HttpFetchAdapter,
    CrawlJobHandler,
    {
      provide: CRAWLER_ADAPTERS,
      useFactory: (httpFetchAdapter: HttpFetchAdapter) => [httpFetchAdapter],
      inject: [HttpFetchAdapter],
    },
  ],
  exports: [
    CrawlJobHandler,
    CRAWLER_ADAPTERS,
    SafeNetworkGatewayService,
    RobotsPolicyService,
    CrawlExecutionWrapper,
    HttpFetchAdapter,
  ],
})
export class CrawlerModule {}
