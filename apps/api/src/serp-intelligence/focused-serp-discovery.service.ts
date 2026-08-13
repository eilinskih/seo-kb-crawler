import { Injectable } from '@nestjs/common';
import {
  FocusedSerpDiscoveryService,
  FocusedSerpResultInput,
  SerpGeoTarget,
  SerpSnapshot,
} from '@seo-kb/serp-intelligence';
import { TopicService } from '@seo-kb/topic-engine';
import {
  KnexUrlFrontierRepository,
  UrlFrontierDiscoveryObservationReceipt,
  UrlFrontierReevaluationResult,
  UrlFrontierReevaluationService,
} from '@seo-kb/url-frontier';

export interface FocusedSerpDiscoveryApiCommand {
  topicId: string;
  query: string;
  language?: string;
  geo?: SerpGeoTarget;
  providerKey?: string;
  results: FocusedSerpResultInput[];
}

export interface FocusedSerpDiscoveryApiResult {
  snapshot: SerpSnapshot;
  observations: {
    submitted: number;
    receipts: UrlFrontierDiscoveryObservationReceipt[];
  };
  frontier: UrlFrontierReevaluationResult;
}

@Injectable()
export class FocusedSerpDiscoveryApiService {
  constructor(
    private readonly topicService: TopicService,
    private readonly serpDiscovery: FocusedSerpDiscoveryService,
    private readonly frontierRepository: KnexUrlFrontierRepository,
    private readonly frontierReevaluation: UrlFrontierReevaluationService,
  ) {}

  async run(
    command: FocusedSerpDiscoveryApiCommand,
  ): Promise<FocusedSerpDiscoveryApiResult> {
    const topic = await this.topicService.get(command.topicId);
    const recorded = await this.serpDiscovery.recordSnapshot({
      ...command,
      topicConfigurationVersion: topic.configurationVersion,
      providerMode: 'manual_import',
      capturedAt: new Date().toISOString(),
    });
    const receipts = await this.frontierRepository.appendDiscoveryObservations(
      recorded.observations,
    );
    const frontier = await this.frontierReevaluation.reevaluatePending({
      limit: Math.max(recorded.observations.length, 1),
      now: new Date(),
    });

    return {
      snapshot: recorded.snapshot,
      observations: {
        submitted: recorded.observations.length,
        receipts,
      },
      frontier,
    };
  }
}
