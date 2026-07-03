import { createCandidateObservation } from '../domain/candidate-observation';
import { DiscoveryValidationError } from '../domain/discovery-errors';
import { providerItemIdentity } from './provider-identity';
import {
  CandidateObservationSink,
  DiscoveryExecutionContext,
  DiscoveryExecutionResult,
  DiscoveryProviderCapabilities,
  DiscoverySourceAdapter,
} from '../domain/discovery-types';

export class LinkSourceAdapter implements DiscoverySourceAdapter {
  readonly key = 'link';
  readonly sourceType = 'link' as const;
  readonly capabilities: DiscoveryProviderCapabilities = {
    supportsLanguage: false,
    supportsCountry: false,
    supportsRegion: false,
    supportsPagination: false,
    supportsResultRank: false,
    supportsResultSnippet: false,
    supportsFreshnessFilter: false,
    maximumPageSize: 1000,
  };

  async execute(
    context: DiscoveryExecutionContext,
    sink: CandidateObservationSink,
  ): Promise<DiscoveryExecutionResult> {
    if (context.configuration.sourceType !== 'link') {
      throw new DiscoveryValidationError('Link adapter requires link configuration');
    }

    const configuration = context.configuration;
    const observations = configuration.links.map((link, index) =>
      createCandidateObservation({
        topicId: context.topicId,
        topicConfigurationVersion: context.topicConfigurationVersion,
        discoveryRunId: context.runId,
        sourceType: context.sourceType,
        sourceKey: context.sourceKey,
        discoveredUrl: link.resolvedUrl,
        providerItemIdentity: providerItemIdentity('link', index, [
          configuration.crawlAttemptId,
          link.href,
          link.resolvedUrl,
        ]),
        sourceUrl: configuration.referringUrl,
        anchorText: link.anchorText,
        metadata: {
          crawlAttemptId: configuration.crawlAttemptId,
          href: link.href,
          rel: link.rel ?? [],
          sourceElement: link.sourceElement,
          position: link.position,
          ...link.metadata,
        },
      }),
    );

    const receipts =
      observations.length === 0 ? [] : await sink.appendBatch(observations);

    return {
      status: 'completed',
      checkpoint: null,
      itemsExamined: configuration.links.length,
      observationsEmitted: receipts.filter(
        (receipt) => receipt.status === 'accepted',
      ).length,
    };
  }
}
