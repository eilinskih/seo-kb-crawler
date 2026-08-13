import { Injectable } from '@nestjs/common';
import {
  DuckDuckGoHtmlSerpSearchProvider,
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

export interface AutomaticFocusedSerpDiscoveryApiCommand {
  topicId: string;
  query?: string;
  language?: string;
  geo?: SerpGeoTarget;
}

export interface AutomaticFocusedSerpDiscoveryApiResult {
  status: 'recorded' | 'degraded_no_results';
  providerKey: string;
  warnings: string[];
  snapshot: SerpSnapshot | null;
  observations: {
    submitted: number;
    receipts: UrlFrontierDiscoveryObservationReceipt[];
  };
  frontier: UrlFrontierReevaluationResult | null;
}

@Injectable()
export class FocusedSerpDiscoveryApiService {
  constructor(
    private readonly topicService: TopicService,
    private readonly serpDiscovery: FocusedSerpDiscoveryService,
    private readonly frontierRepository: KnexUrlFrontierRepository,
    private readonly frontierReevaluation: UrlFrontierReevaluationService,
    private readonly serpSearchProvider: DuckDuckGoHtmlSerpSearchProvider,
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

  async runFromTopic(
    command: AutomaticFocusedSerpDiscoveryApiCommand,
  ): Promise<AutomaticFocusedSerpDiscoveryApiResult> {
    const topic = await this.topicService.get(command.topicId);
    const query = command.query?.trim() || firstSeedKeyword(topic);
    if (!query) {
      return {
        status: 'degraded_no_results',
        providerKey: this.serpSearchProvider.providerKey,
        warnings: ['Topic has no seed keyword for automatic SERP discovery.'],
        snapshot: null,
        observations: { submitted: 0, receipts: [] },
        frontier: null,
      };
    }

    const searchResult = await this.serpSearchProvider.search({
      query,
      language: command.language ?? topicLanguage(topic),
      geo: command.geo ?? topicGeo(topic),
      limit: topic.discovery.search.maxResultsPerQuery,
    });

    if (searchResult.results.length === 0) {
      return {
        status: 'degraded_no_results',
        providerKey: searchResult.providerKey,
        warnings: searchResult.warnings,
        snapshot: null,
        observations: { submitted: 0, receipts: [] },
        frontier: null,
      };
    }

    const recorded = await this.serpDiscovery.recordSnapshot({
      topicId: topic.id,
      topicConfigurationVersion: topic.configurationVersion,
      query,
      language: command.language ?? topicLanguage(topic),
      geo: command.geo ?? topicGeo(topic),
      providerKey: searchResult.providerKey,
      providerMode: searchResult.providerMode,
      degraded: searchResult.degraded,
      warnings: searchResult.warnings,
      results: searchResult.results,
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
      status: 'recorded',
      providerKey: searchResult.providerKey,
      warnings: searchResult.warnings,
      snapshot: recorded.snapshot,
      observations: {
        submitted: recorded.observations.length,
        receipts,
      },
      frontier,
    };
  }
}

type TopicRecordLike = Awaited<ReturnType<TopicService['get']>>;

function firstSeedKeyword(topic: TopicRecordLike): string | null {
  return topic.discovery.search.queries[0]?.text?.trim() || null;
}

function topicLanguage(topic: TopicRecordLike): string | undefined {
  return topic.languageGeo.languages[0]?.tag ??
    topic.discovery.search.queries[0]?.language;
}

function topicGeo(topic: TopicRecordLike): SerpGeoTarget | undefined {
  const queryGeo = topic.discovery.search.queries[0]?.geo;
  const targetGeo = topic.languageGeo.geoTargets[0];
  const countryCode = queryGeo?.countryCode ?? targetGeo?.countryCode;
  const regionCode = queryGeo?.regionCode ?? targetGeo?.regionCode;
  return countryCode || regionCode ? { countryCode, regionCode } : undefined;
}
