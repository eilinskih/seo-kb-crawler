import { Inject, Injectable, Optional } from '@nestjs/common';
import { createCrawlCommand } from './domain/crawl-command';
import { CrawlerAdapterSelectionError } from './domain/crawler-errors';
import { CrawlerAdapterSelector } from './domain/crawler-adapter-selector';
import { CrawlResultNormalizer } from './domain/crawl-result-normalizer';
import {
  CrawlCommandPayload,
  CrawlerAdapter,
  NormalizedCrawlResult,
} from './domain/crawler-types';

export const CRAWLER_ADAPTERS = Symbol('CRAWLER_ADAPTERS');

@Injectable()
export class CrawlJobHandler {
  constructor(
    private readonly adapterSelector: CrawlerAdapterSelector,
    private readonly resultNormalizer: CrawlResultNormalizer,
    @Optional()
    @Inject(CRAWLER_ADAPTERS)
    private readonly adapters: CrawlerAdapter[] = [],
  ) {}

  async handle(payload: CrawlCommandPayload): Promise<NormalizedCrawlResult> {
    const command = createCrawlCommand(payload);

    try {
      const adapter = this.adapterSelector.select(command, this.adapters);
      const controller = new AbortController();
      const result = await adapter.crawl({
        command,
        robotsDecision: {
          allowed: true,
          checkedUrl: command.normalizedUrl,
          userAgent: command.policy.userAgent,
        },
        deadline: command.deadline,
        signal: controller.signal,
      });

      return this.resultNormalizer.normalize(command, adapter, result);
    } catch (error) {
      if (!(error instanceof CrawlerAdapterSelectionError)) {
        throw error;
      }

      return this.resultNormalizer.normalize(
        command,
        { key: 'unconfigured', version: '0.0.0' },
        {
          status: 'failed_terminal',
          timing: { totalMs: 0 },
          failure: {
            category: 'adapter_error',
            detail: error.message,
            retryable: false,
          },
        },
      );
    }
  }
}
