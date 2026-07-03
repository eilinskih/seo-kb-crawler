import { Injectable } from '@nestjs/common';
import { CrawlerAdapterSelectionError } from './crawler-errors';
import {
  CrawlCommand,
  CrawlerAdapter,
  CrawlerAdapterCapabilities,
} from './crawler-types';

@Injectable()
export class CrawlerAdapterSelector {
  select(command: CrawlCommand, adapters: CrawlerAdapter[]): CrawlerAdapter {
    const adapter = adapters.find((candidate) =>
      isCompatible(command, candidate.capabilities),
    );

    if (!adapter) {
      throw new CrawlerAdapterSelectionError(
        'No compatible crawler adapter is configured',
      );
    }

    return adapter;
  }
}

function isCompatible(
  command: CrawlCommand,
  capabilities: CrawlerAdapterCapabilities,
): boolean {
  if (
    command.policy.requiresJavaScript &&
    !capabilities.supportsJavaScriptRendering
  ) {
    return false;
  }
  if (
    command.policy.requiresMarkdown &&
    !capabilities.supportsMarkdownExtraction
  ) {
    return false;
  }
  if (
    command.policy.requiresPlainText &&
    !capabilities.supportsPlainTextExtraction
  ) {
    return false;
  }
  if (
    command.policy.respectRobots &&
    !capabilities.supportsRobotsAwareFetch
  ) {
    return false;
  }
  if (command.policy.maxBodyBytes > capabilities.maximumBodyBytes) {
    return false;
  }
  if (command.policy.timeoutMs > capabilities.maximumExecutionMs) {
    return false;
  }
  return true;
}
