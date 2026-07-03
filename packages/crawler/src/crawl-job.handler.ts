import { Injectable } from '@nestjs/common';
import { createCrawlCommand } from './domain/crawl-command';
import { CrawlResultNormalizer } from './domain/crawl-result-normalizer';
import {
  CrawlCommandPayload,
  NormalizedCrawlResult,
} from './domain/crawler-types';

export const CRAWLER_ADAPTERS = Symbol('CRAWLER_ADAPTERS');

@Injectable()
export class CrawlJobHandler {
  constructor(private readonly resultNormalizer: CrawlResultNormalizer) {}

  async handle(payload: CrawlCommandPayload): Promise<NormalizedCrawlResult> {
    const command = createCrawlCommand(payload);

    return this.resultNormalizer.normalize(
      command,
      {
        key: 'unconfigured',
        version: '0.0.0',
      },
      {
        status: 'failed_terminal',
        timing: { totalMs: 0 },
        failure: {
          category: 'adapter_error',
          detail:
            'Crawler adapters are disabled until safe network gateway, robots policy and deadline enforcement are implemented',
          retryable: false,
        },
      },
    );
  }
}
