import { Inject, Injectable } from '@nestjs/common';
import { createCrawlCommand } from './domain/crawl-command';
import { CrawlExecutionWrapper } from './crawl-execution-wrapper';
import { CrawlerAdapterSelector } from './domain/crawler-adapter-selector';
import { CrawlerAdapterSelectionError } from './domain/crawler-errors';
import { CrawlResultNormalizer } from './domain/crawl-result-normalizer';
import {
  CrawlerAdapter,
  CrawlResultSink,
  CrawlCommandPayload,
  NormalizedCrawlResult,
} from './domain/crawler-types';

export const CRAWLER_ADAPTERS = Symbol('CRAWLER_ADAPTERS');
export const CRAWL_RESULT_SINK = Symbol('CRAWL_RESULT_SINK');

@Injectable()
export class CrawlJobHandler {
  constructor(
    private readonly resultNormalizer: CrawlResultNormalizer,
    private readonly executionWrapper: CrawlExecutionWrapper,
    private readonly adapterSelector: CrawlerAdapterSelector,
    @Inject(CRAWLER_ADAPTERS)
    private readonly adapters: CrawlerAdapter[],
    @Inject(CRAWL_RESULT_SINK)
    private readonly resultSink: CrawlResultSink,
  ) {}

  async handle(payload: CrawlCommandPayload): Promise<NormalizedCrawlResult> {
    const command = createCrawlCommand(payload);
    const preparation = await this.executionWrapper.prepare(command);

    if (preparation.status === 'blocked') {
      return this.appendAndReturn(
        this.resultNormalizer.normalize(
          command,
          disabledAdapter(),
          preparation.result,
        ),
      );
    }

    let normalizedResult: NormalizedCrawlResult;
    try {
      const adapter = this.adapterSelector.select(command, this.adapters);
      const result = await adapter.crawl(preparation.context);
      normalizedResult = this.resultNormalizer.normalize(command, adapter, result);
    } catch (error) {
      normalizedResult = this.resultNormalizer.normalize(
        command,
        disabledAdapter(),
        {
          status: 'failed_terminal',
          timing: { totalMs: 0 },
          failure: {
            category: 'adapter_error',
            detail: adapterErrorDetail(error),
            retryable: false,
          },
        },
      );
    } finally {
      preparation.dispose();
    }

    return this.appendAndReturn(normalizedResult);
  }

  private async appendAndReturn(
    result: NormalizedCrawlResult,
  ): Promise<NormalizedCrawlResult> {
    await this.resultSink.append(result);
    return result;
  }
}

function disabledAdapter(): { key: string; version: string } {
  return {
    key: 'unconfigured',
    version: '0.0.0',
  };
}

function adapterErrorDetail(error: unknown): string {
  if (error instanceof CrawlerAdapterSelectionError) {
    return error.message;
  }
  if (error instanceof Error) {
    return `Crawler adapter failed: ${error.message}`;
  }
  return 'Crawler adapter failed';
}
