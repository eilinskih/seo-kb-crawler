import {
  createCandidateObservation,
} from '../domain/candidate-observation';
import { providerItemIdentity } from './provider-identity';
import { DiscoveryValidationError } from '../domain/discovery-errors';
import {
  CandidateObservationSink,
  DiscoveryExecutionContext,
  DiscoveryExecutionResult,
  DiscoveryProviderCapabilities,
  DiscoverySourceAdapter,
} from '../domain/discovery-types';

export class SeedSourceAdapter implements DiscoverySourceAdapter {
  readonly key = 'seed';
  readonly sourceType = 'seed' as const;
  readonly capabilities: DiscoveryProviderCapabilities = {
    supportsLanguage: false,
    supportsCountry: false,
    supportsRegion: false,
    supportsPagination: false,
    supportsResultRank: true,
    supportsResultSnippet: false,
    supportsFreshnessFilter: false,
    maximumPageSize: 500,
  };

  async execute(
    context: DiscoveryExecutionContext,
    sink: CandidateObservationSink,
  ): Promise<DiscoveryExecutionResult> {
    if (context.configuration.sourceType !== 'seed') {
      throw new DiscoveryValidationError('Seed adapter requires seed configuration');
    }

    const observations = context.configuration.urls.map((url, index) =>
      createCandidateObservation({
        topicId: context.topicId,
        topicConfigurationVersion: context.topicConfigurationVersion,
        discoveryRunId: context.runId,
        sourceType: context.sourceType,
        sourceKey: context.sourceKey,
        discoveredUrl: url,
        providerItemIdentity: providerItemIdentity('seed', index, [url]),
        sourceRank: index + 1,
        metadata: {
          seedOrder: index + 1,
        },
      }),
    );

    const receipts =
      observations.length === 0 ? [] : await sink.appendBatch(observations);

    return {
      status: 'completed',
      checkpoint: null,
      itemsExamined: context.configuration.urls.length,
      observationsEmitted: receipts.filter(
        (receipt) => receipt.status === 'accepted',
      ).length,
    };
  }
}
