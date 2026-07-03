import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { CrawlExecutionWrapper } from './crawl-execution-wrapper';
import {
  CrawlJobHandler,
  CRAWLER_ADAPTERS,
  CRAWL_RESULT_SINK,
} from './crawl-job.handler';
import { CrawlerAdapterSelector } from './domain/crawler-adapter-selector';
import { CrawlResultNormalizer } from './domain/crawl-result-normalizer';
import { HttpFetchAdapter } from './infrastructure/http-fetch-adapter';
import { InMemoryCrawlResultSink } from './infrastructure/in-memory-crawl-result-sink';
import { KnexCrawlAttemptResultSink } from './infrastructure/knex-crawl-attempt-result-sink';
import { RobotsPolicyService } from './infrastructure/robots-policy.service';
import { SafeNetworkGatewayService } from './infrastructure/safe-network-gateway.service';

@Module({
  imports: [DbModule],
  providers: [
    CrawlerAdapterSelector,
    CrawlResultNormalizer,
    SafeNetworkGatewayService,
    RobotsPolicyService,
    CrawlExecutionWrapper,
    HttpFetchAdapter,
    InMemoryCrawlResultSink,
    KnexCrawlAttemptResultSink,
    CrawlJobHandler,
    {
      provide: CRAWLER_ADAPTERS,
      useFactory: (httpFetchAdapter: HttpFetchAdapter) => [httpFetchAdapter],
      inject: [HttpFetchAdapter],
    },
    {
      provide: CRAWL_RESULT_SINK,
      useExisting: KnexCrawlAttemptResultSink,
    },
  ],
  exports: [
    CrawlJobHandler,
    CRAWLER_ADAPTERS,
    CRAWL_RESULT_SINK,
    SafeNetworkGatewayService,
    RobotsPolicyService,
    CrawlExecutionWrapper,
    HttpFetchAdapter,
    InMemoryCrawlResultSink,
    KnexCrawlAttemptResultSink,
  ],
})
export class CrawlerModule {}
