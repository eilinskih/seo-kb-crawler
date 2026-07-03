import { Injectable } from '@nestjs/common';
import {
  CrawlResultSink,
  NormalizedCrawlResult,
} from '../domain/crawler-types';

@Injectable()
export class InMemoryCrawlResultSink implements CrawlResultSink {
  private readonly results: NormalizedCrawlResult[] = [];

  async append(result: NormalizedCrawlResult): Promise<void> {
    this.results.push(structuredClone(result));
  }

  snapshot(): NormalizedCrawlResult[] {
    return this.results.map((result) => structuredClone(result));
  }
}
