import { Injectable } from '@nestjs/common';
import { createCrawlCommand } from './domain/crawl-command';
import { CrawlExecutionWrapper } from './crawl-execution-wrapper';
import { CrawlResultNormalizer } from './domain/crawl-result-normalizer';
import {
  CrawlCommandPayload,
  NormalizedCrawlResult,
} from './domain/crawler-types';

export const CRAWLER_ADAPTERS = Symbol('CRAWLER_ADAPTERS');

@Injectable()
export class CrawlJobHandler {
  constructor(
    private readonly resultNormalizer: CrawlResultNormalizer,
    private readonly executionWrapper: CrawlExecutionWrapper,
  ) {}

  async handle(payload: CrawlCommandPayload): Promise<NormalizedCrawlResult> {
    const command = createCrawlCommand(payload);
    const preparation = await this.executionWrapper.prepare(command);

    if (preparation.status === 'blocked') {
      return this.resultNormalizer.normalize(
        command,
        disabledAdapter(),
        preparation.result,
      );
    }

    preparation.dispose();

    return this.resultNormalizer.normalize(
      command,
      disabledAdapter(),
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

function disabledAdapter(): { key: string; version: string } {
  return {
    key: 'unconfigured',
    version: '0.0.0',
  };
}
