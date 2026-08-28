import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExternalEntityEnrichmentService } from '@seo-kb/external-entity-enrichment';
import { DEMAND_ENGINE_REPOSITORY } from './demand-engine.tokens';
import {
  DemandDiscoveryRequest,
  DemandDiscoveryResult,
  DemandProviderAdapter,
} from './domain/demand-engine-types';
import {
  DemandDiscoveryPersistenceResult,
  DemandEngineRepository,
} from './persistence/demand-engine.repository';
import {
  DemandEntityEnrichmentDispatchService,
} from './demand-entity-enrichment-queue';
import { DemandEngineService } from './demand-engine.service';
import {
  EntityEnrichedPhraseAnalysisProvider,
} from './phrase-analysis/entity-enriched-phrase-analysis.provider';
import { FreePhraseAnalysisProvider } from './phrase-analysis/free-phrase-analysis.provider';
import { PhraseAnalysisProvider } from './phrase-analysis/phrase-analysis-types';
import {
  SelfHostedNlpPhraseAnalysisProvider,
} from './phrase-analysis/self-hosted-nlp-phrase-analysis.provider';

export interface DiscoverAndPersistDemandCommand extends DemandDiscoveryRequest {
  observedAt?: string;
}

export interface DiscoverAndPersistDemandResult {
  discovery: DemandDiscoveryResult;
  persistence: DemandDiscoveryPersistenceResult;
}

@Injectable()
export class DemandDiscoveryPersistenceService {
  private readonly demandEngine: DemandEngineService;
  private readonly asyncEntityEnrichment: boolean;

  constructor(
    @Inject(DEMAND_ENGINE_REPOSITORY)
    private readonly repository: DemandEngineRepository,
    @Optional()
    providers?: DemandProviderAdapter[],
    @Optional()
    entityEnrichment?: ExternalEntityEnrichmentService,
    @Optional()
    config?: ConfigService,
    @Optional()
    private readonly entityEnrichmentDispatch?: DemandEntityEnrichmentDispatchService,
  ) {
    this.asyncEntityEnrichment = isAsyncEntityEnrichmentEnabled(config);
    this.demandEngine = new DemandEngineService(
      providers,
      phraseAnalysisProvider(entityEnrichment, config),
    );
  }

  async discoverAndPersist(
    command: DiscoverAndPersistDemandCommand,
  ): Promise<DiscoverAndPersistDemandResult> {
    const observedAt = command.observedAt ?? new Date().toISOString();
    const discovery = await this.demandEngine.discover(command);
    const persistence = await this.repository.saveDiscoveryResult({
      result: discovery,
      topicId: command.topicId,
      observedAt,
    });
    if (this.asyncEntityEnrichment) {
      await this.entityEnrichmentDispatch?.dispatch({
        topicSeed: command.topicSeed,
        topicId: command.topicId,
        discovery,
        persistence,
        queuedAt: observedAt,
      });
    }

    return {
      discovery,
      persistence,
    };
  }
}

function phraseAnalysisProvider(
  entityEnrichment?: ExternalEntityEnrichmentService,
  config?: ConfigService,
): PhraseAnalysisProvider {
  const nlpEndpoint = config?.get<string>('PHRASE_ANALYSIS_NLP_ENDPOINT');
  const nlpTimeoutMs = numberConfig(
    config?.get<string>('PHRASE_ANALYSIS_NLP_TIMEOUT_MS'),
  );
  const structural = new FreePhraseAnalysisProvider();
  const base = nlpEndpoint
    ? new SelfHostedNlpPhraseAnalysisProvider({
        endpoint: nlpEndpoint,
        timeoutMs: nlpTimeoutMs,
      })
    : structural;

  if (!entityEnrichment || isAsyncEntityEnrichmentEnabled(config)) {
    return base;
  }

  return new EntityEnrichedPhraseAnalysisProvider(entityEnrichment, {
    fallbackProvider: base,
    maxLookups: numberConfig(
      config?.get<string>('PHRASE_ANALYSIS_ENTITY_MAX_LOOKUPS'),
    ),
    maxSpanTokens: numberConfig(
      config?.get<string>('PHRASE_ANALYSIS_ENTITY_MAX_SPAN_TOKENS'),
    ),
  });
}

function isAsyncEntityEnrichmentEnabled(config?: ConfigService): boolean {
  return config?.get<string>('EXTERNAL_ENTITY_ENRICHMENT_ASYNC') !== 'false';
}

function numberConfig(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
