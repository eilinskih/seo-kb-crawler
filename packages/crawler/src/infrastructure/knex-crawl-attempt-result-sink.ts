import { Injectable } from '@nestjs/common';
import { UrlFrontierCompletionService } from '@seo-kb/url-frontier';
import {
  CrawlResultSink,
  NormalizedCrawlResult,
} from '../domain/crawler-types';

@Injectable()
export class KnexCrawlAttemptResultSink implements CrawlResultSink {
  constructor(
    private readonly urlFrontierCompletionService:
      UrlFrontierCompletionService,
  ) {}

  async append(result: NormalizedCrawlResult): Promise<void> {
    await this.urlFrontierCompletionService.complete(result);
  }
}
