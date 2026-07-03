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
    const orderedAdapters = this.orderAdapters(command, adapters);
    const adapter = orderedAdapters.find((candidate) =>
      isCompatible(command, candidate.capabilities),
    );

    if (!adapter) {
      throw new CrawlerAdapterSelectionError(
        'No compatible crawler adapter is configured',
      );
    }

    return adapter;
  }

  private orderAdapters(
    command: CrawlCommand,
    adapters: CrawlerAdapter[],
  ): CrawlerAdapter[] {
    const preference = command.policy.adapterPreference;
    if (!preference) {
      return adapters;
    }

    return [...adapters].sort((left, right) => {
      const leftIndex = preference.indexOf(left.key);
      const rightIndex = preference.indexOf(right.key);
      const normalizedLeftIndex =
        leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const normalizedRightIndex =
        rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
      return normalizedLeftIndex - normalizedRightIndex;
    });
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
