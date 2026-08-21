import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChunkingDispatchService } from '@seo-kb/chunking';
import { ContentProcessingDispatchService } from '@seo-kb/content-processing';
import { DbService } from '@seo-kb/db';
import {
  DemandObservation,
  DemandDiscoveryPersistenceService,
  DemandEngineRepository,
  DemandCandidatePageRecord,
  DEMAND_ENGINE_REPOSITORY,
  creatablePlannedPages,
} from '@seo-kb/demand-engine';
import { EmbeddingDispatchService } from '@seo-kb/embeddings';
import { ExternalEntityEnrichmentService } from '@seo-kb/external-entity-enrichment';
import { FactExtractionDispatchService } from '@seo-kb/fact-extraction';
import { SerpGeoTarget } from '@seo-kb/serp-intelligence';
import {
  SeoPackProfileName,
  SeoPackGeneratorService,
  SeoPackRepository,
  SeoPackSourceReference,
  SEO_PACK_REPOSITORY,
} from '@seo-kb/seo-pack';
import { TopicRecord, TopicService } from '@seo-kb/topic-engine';
import { UrlFrontierDispatchService } from '@seo-kb/url-frontier';
import {
  AutomaticFocusedSerpDiscoveryApiResult,
  FocusedSerpDiscoveryApiService,
} from '../serp-intelligence/focused-serp-discovery.service';

export type TopicWorkRunStageStatus = 'completed' | 'skipped' | 'failed';

export interface TopicWorkRunStage {
  name:
    | 'topic_activation'
    | 'focused_serp_discovery'
    | 'demand_discovery'
    | 'topic_universe_serp_validation'
    | 'url_frontier_dispatch'
    | 'content_processing_dispatch'
    | 'chunking_dispatch'
    | 'embedding_dispatch'
    | 'fact_extraction_dispatch'
    | 'seo_pack_generation';
  status: TopicWorkRunStageStatus;
  message: string;
  result?: unknown;
}

export interface TopicWorkRunResult {
  runId: string;
  topicId: string;
  status: 'completed' | 'degraded' | 'skipped';
  startedAt: string;
  completedAt: string;
  stages: TopicWorkRunStage[];
  warnings: string[];
}

export interface TopicWorkLoopStatus {
  enabled: boolean;
  running: boolean;
  intervalMs: number;
  lastTickAt: string | null;
  lastRuns: TopicWorkRunResult[];
}

export interface RunTopicWorkOptions {
  topicId: string;
  force?: boolean;
}

const defaultIntervalMs = 60_000;
const defaultSerpRefreshIntervalMs = 24 * 60 * 60 * 1000;
const crawlDispatchLimit = 10;
const processingDispatchLimit = 10;
const chunkingDispatchLimit = 20;
const embeddingCandidateLimit = 100;
const embeddingBatchSize = 20;
const factCandidateLimit = 100;
const factBatchSize = 20;
const demandDiscoveryLimit = 300;
const topicUniverseSerpProbeLimit = 25;
const seoPackGenerationLimit = 50;

@Injectable()
export class TopicWorkRunService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TopicWorkRunService.name);
  private readonly intervalMs: number;
  private readonly serpRefreshIntervalMs: number;
  private readonly autoStart: boolean;
  private timer: NodeJS.Timeout | null = null;
  private tickRunning = false;
  private lastTickAt: string | null = null;
  private readonly lastRuns = new Map<string, TopicWorkRunResult>();
  private readonly lastSerpAttemptAt = new Map<string, number>();

  constructor(
    private readonly config: ConfigService,
    private readonly db: DbService,
    private readonly topics: TopicService,
    private readonly serpDiscovery: FocusedSerpDiscoveryApiService,
    private readonly demandDiscovery: DemandDiscoveryPersistenceService,
    @Inject(DEMAND_ENGINE_REPOSITORY)
    private readonly demandRepository: DemandEngineRepository,
    private readonly entityEnrichment: ExternalEntityEnrichmentService,
    private readonly urlFrontierDispatch: UrlFrontierDispatchService,
    private readonly contentProcessingDispatch: ContentProcessingDispatchService,
    private readonly chunkingDispatch: ChunkingDispatchService,
    private readonly embeddingDispatch: EmbeddingDispatchService,
    private readonly factExtractionDispatch: FactExtractionDispatchService,
    private readonly seoPackGenerator: SeoPackGeneratorService,
    @Inject(SEO_PACK_REPOSITORY)
    private readonly seoPacks: SeoPackRepository,
  ) {
    this.intervalMs = positiveInteger(
      this.config.get<string>('TOPIC_WORK_RUN_INTERVAL_MS'),
      defaultIntervalMs,
    );
    this.serpRefreshIntervalMs = positiveInteger(
      this.config.get<string>('TOPIC_WORK_RUN_SERP_REFRESH_INTERVAL_MS'),
      defaultSerpRefreshIntervalMs,
    );
    this.autoStart =
      this.config.get<string>('TOPIC_WORK_RUN_AUTOSTART') !== 'false' &&
      process.env.NODE_ENV !== 'test';
  }

  onModuleInit(): void {
    if (this.autoStart) {
      this.start();
    }
  }

  onModuleDestroy(): void {
    this.stop();
  }

  start(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
    void this.tick();
  }

  stop(): void {
    if (!this.timer) {
      return;
    }
    clearInterval(this.timer);
    this.timer = null;
  }

  status(): TopicWorkLoopStatus {
    return {
      enabled: Boolean(this.timer),
      running: this.tickRunning,
      intervalMs: this.intervalMs,
      lastTickAt: this.lastTickAt,
      lastRuns: Array.from(this.lastRuns.values())
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    };
  }

  lastRun(topicId: string): TopicWorkRunResult | null {
    return this.lastRuns.get(topicId) ?? null;
  }

  async tick(): Promise<TopicWorkRunResult[]> {
    if (this.tickRunning) {
      return [];
    }

    this.tickRunning = true;
    this.lastTickAt = new Date().toISOString();
    try {
      const topics = await this.topics.list();
      const eligibleTopics = topics.filter(isWorkEligibleTopic);
      const results: TopicWorkRunResult[] = [];

      for (const topic of eligibleTopics) {
        results.push(await this.runTopic({
          topicId: topic.id,
        }));
      }

      return results;
    } finally {
      this.tickRunning = false;
    }
  }

  async runTopic(
    options: RunTopicWorkOptions,
  ): Promise<TopicWorkRunResult> {
    const startedAt = new Date();
    const stages: TopicWorkRunStage[] = [];
    const warnings: string[] = [];
    const runId = [
      'topic-work',
      options.topicId,
      startedAt.getTime(),
    ].join(':');
    let topic = await this.topics.get(options.topicId);

    if (topic.status === 'paused' || topic.status === 'archived') {
      const skipped = {
        runId,
        topicId: options.topicId,
        status: 'skipped' as const,
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        stages: [{
          name: 'topic_activation' as const,
          status: 'skipped' as const,
          message: `Topic is ${topic.status}.`,
        }],
        warnings,
      };
      this.lastRuns.set(options.topicId, skipped);
      return skipped;
    }

    stages.push(await this.runStage('topic_activation', async () => {
      if (topic.status !== 'draft') {
        return {
          status: 'skipped' as const,
          message: `Topic is already ${topic.status}.`,
        };
      }
      topic = await this.topics.activate(topic.id);
      return {
        status: 'completed' as const,
        message: 'Draft topic activated for automated work.',
        result: { status: topic.status },
      };
    }, warnings));

    stages.push(await this.runStage('focused_serp_discovery', async () => {
      if (!this.shouldRefreshSerp(topic.id, options.force)) {
        return {
          status: 'skipped' as const,
          message: 'SERP refresh interval has not elapsed.',
        };
      }
      this.lastSerpAttemptAt.set(topic.id, Date.now());
      const result = await this.serpDiscovery.runFromTopic({
        topicId: topic.id,
      });
      warnings.push(
        ...result.warnings.map((warning) =>
          `focused_serp_discovery: ${warning}`,
        ),
      );
      const message = serpDiscoveryMessage(result);
      return {
        status: result.status === 'recorded' ? 'completed' as const : 'skipped' as const,
        message,
        result,
      };
    }, warnings));

    stages.push(await this.runStage('demand_discovery', async () => {
      const seedQuery = firstSeedKeyword(topic);
      if (!seedQuery) {
        return {
          status: 'skipped' as const,
          message: 'Topic has no seed keyword for Demand discovery.',
        };
      }
      const language = topicLanguage(topic);
      const geo = {
        ...topicGeo(topic),
        city: inferCity(seedQuery),
      };
      const entityVocabulary = await this.entityVocabulary({
        seedQuery,
        language,
        geo,
        warnings,
      });
      const evidenceObservations = await this.collectDemandEvidence({
        topicId: topic.id,
        seedQuery,
        warnings,
      });
      const result = await this.demandDiscovery.discoverAndPersist({
        topicId: topic.id,
        topicSeed: seedQuery,
        language,
        geo,
        manualSeeds: entityVocabulary,
        evidenceObservations,
        limit: demandDiscoveryLimit,
      });
      return {
        status: 'completed' as const,
        message: `Discovered ${result.persistence.keywordCandidates.length} demand candidates and ${result.persistence.candidatePages.length} candidate pages.`,
        result: {
          keywordCandidates: result.persistence.keywordCandidates.length,
          candidatePages: result.persistence.candidatePages.length,
          evidenceObservations: evidenceObservations.length,
          fallbackMode: result.discovery.fallbackMode,
          warnings: result.discovery.warnings,
        },
      };
    }, warnings));

    stages.push(await this.runStage('topic_universe_serp_validation', async () => {
      const universeRefreshKey = `${topic.id}:universe`;
      const candidatePages = await this.demandRepository.listCandidatePages(topic.id);
      const hasUnvalidatedCandidates = candidatePages.some(needsSerpValidation);
      if (
        !hasUnvalidatedCandidates &&
        !this.shouldRefreshSerp(universeRefreshKey, options.force)
      ) {
        return {
          status: 'skipped' as const,
          message: 'Topic universe SERP refresh interval has not elapsed.',
        };
      }
      this.lastSerpAttemptAt.set(universeRefreshKey, Date.now());
      const queries = selectTopicUniverseSerpQueries(
        candidatePages,
        topicUniverseSerpProbeLimit,
      );
      const results: AutomaticFocusedSerpDiscoveryApiResult[] = [];
      for (const query of queries) {
        const result = await this.serpDiscovery.runFromTopic({
          topicId: topic.id,
          query,
          language: topicLanguage(topic),
          geo: topicGeo(topic),
        });
        results.push(result);
        warnings.push(...result.warnings.map((warning) =>
          `topic_universe_serp_validation:${query}: ${warning}`,
        ));
      }
      const recorded = results.filter((result) => result.status === 'recorded');
      const validatedPages = await this.demandRepository.markCandidatePagesSerpValidated({
        topicId: topic.id,
        validatedAt: new Date().toISOString(),
        validations: recorded.flatMap((result) =>
          result.snapshot
            ? [{
                query: result.snapshot.normalizedQuery,
                evidenceUrls: result.snapshot.results
                  .map((serpResult) => serpResult.url)
                  .filter(Boolean)
                  .slice(0, 10),
              }]
            : [],
        ),
      });
      return {
        status: queries.length > 0 ? 'completed' as const : 'skipped' as const,
        message: `Validated ${recorded.length}/${queries.length} generated demand queries with SERP.`,
        result: {
          attempted: queries.length,
          recorded: recorded.length,
          candidatePagesUpdated: validatedPages.length,
          submittedUrls: recorded.reduce(
            (total, result) => total + result.observations.submitted,
            0,
          ),
          queries,
        },
      };
    }, warnings));

    stages.push(await this.runStage('url_frontier_dispatch', () =>
      this.urlFrontierDispatch.dispatchBatch({
        leaseOwner: 'topic-work-run',
        leaseDurationMs: 15 * 60 * 1000,
        now: new Date(),
        maxDispatches: crawlDispatchLimit,
      }).then((result) => ({
        status: 'completed' as const,
        message: `Dispatched ${result.dispatched} crawl jobs.`,
        result,
      })),
    warnings));

    stages.push(await this.runStage('content_processing_dispatch', () =>
      this.contentProcessingDispatch.dispatchPendingSuccessfulAttempts({
        maxDispatches: processingDispatchLimit,
      }).then((result) => ({
        status: 'completed' as const,
        message: `Dispatched ${result.dispatched} content processing jobs.`,
        result,
      })),
    warnings));

    const now = new Date();
    stages.push(await this.runStage('chunking_dispatch', () =>
      this.chunkingDispatch.dispatchUnchunkedDocumentVersions({
        limit: chunkingDispatchLimit,
        now,
      }).then((result) => ({
        status: 'completed' as const,
        message: `Chunked ${result.chunkedCount} document versions.`,
        result,
      })),
    warnings));

    stages.push(await this.runStage('embedding_dispatch', () =>
      this.embeddingDispatch.dispatchMissingEmbeddings({
        limit: embeddingCandidateLimit,
        batchSize: embeddingBatchSize,
        now: new Date(),
      }).then((result) => ({
        status: 'completed' as const,
        message: `Enqueued ${result.enqueuedJobCount} embedding jobs.`,
        result,
      })),
    warnings));

    stages.push(await this.runStage('fact_extraction_dispatch', () =>
      this.factExtractionDispatch.dispatchMissingFactExtraction({
        limit: factCandidateLimit,
        batchSize: factBatchSize,
        now: new Date(),
      }).then((result) => ({
        status: 'completed' as const,
        message: `Enqueued ${result.enqueuedJobCount} fact extraction jobs.`,
        result,
      })),
    warnings));

    stages.push(await this.runStage('seo_pack_generation', () =>
      this.generateReadyCandidateSeoPacks(topic).then((result) => ({
        status: result.generated > 0 ? 'completed' as const : 'skipped' as const,
        message: result.message,
        result,
      })),
    warnings));

    const failed = stages.some((stage) => stage.status === 'failed');
    const result: TopicWorkRunResult = {
      runId,
      topicId: topic.id,
      status: failed || warnings.length > 0 ? 'degraded' : 'completed',
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      stages,
      warnings,
    };
    this.lastRuns.set(topic.id, result);
    return result;
  }

  private async runStage(
    name: TopicWorkRunStage['name'],
    run: () => Promise<Omit<TopicWorkRunStage, 'name'>>,
    warnings: string[],
  ): Promise<TopicWorkRunStage> {
    try {
      return { name, ...await run() };
    } catch (error) {
      const message = errorMessage(error);
      warnings.push(`${name}: ${message}`);
      this.logger.warn(`${name} failed: ${message}`);
      return {
        name,
        status: 'failed',
        message,
      };
    }
  }

  private shouldRefreshSerp(topicId: string, force: boolean | undefined): boolean {
    if (force) {
      return true;
    }
    const lastAttemptAt = this.lastSerpAttemptAt.get(topicId);
    return lastAttemptAt === undefined ||
      Date.now() - lastAttemptAt >= this.serpRefreshIntervalMs;
  }

  private async generateReadyCandidateSeoPacks(topic: TopicRecord): Promise<{
    generated: number;
    skippedExisting: number;
    eligible: number;
    seoPackIds: string[];
    message: string;
  }> {
    const readyPages = creatablePlannedPages(
      await this.demandRepository.listCandidatePages(topic.id),
    )
      .slice(0, seoPackGenerationLimit);
    if (readyPages.length === 0) {
      return {
        generated: 0,
        skippedExisting: 0,
        eligible: 0,
        seoPackIds: [],
        message: 'No ready Demand candidate pages are available for SEO Pack generation.',
      };
    }

    let skippedExisting = 0;
    const seoPackIds: string[] = [];
    for (const page of readyPages) {
      const candidateKey = candidateKeyForPage(page);
      const existing = await this.seoPacks.findLatestSeoPack(topic.id, candidateKey);
      if (existing) {
        skippedExisting += 1;
        continue;
      }

      const saved = await this.seoPacks.saveSeoPack({
        pack: this.seoPackGenerator.generate(
          seoPackRequestForPage(topic, page, candidateKey),
        ),
        createdAt: new Date().toISOString(),
      });
      seoPackIds.push(saved.id);
    }

    return {
      generated: seoPackIds.length,
      skippedExisting,
      eligible: readyPages.length,
      seoPackIds,
      message: `Generated ${seoPackIds.length} SEO Packs for planned creatable Demand candidate pages.`,
    };
  }

  private async collectDemandEvidence(options: {
    topicId: string;
    seedQuery: string;
    warnings: string[];
  }): Promise<DemandObservation[]> {
    try {
      const [snapshots, documents] = await Promise.all([
        this.latestSerpSnapshots(options.topicId),
        this.latestDocumentVersions(options.topicId),
      ]);
      return uniqueObservations([
        ...snapshots.flatMap((snapshot) =>
          serpEvidenceObservations(snapshot, options.seedQuery),
        ),
        ...documents.flatMap((document) =>
          documentEvidenceObservations(document, options.seedQuery),
        ),
      ]).slice(0, 250);
    } catch (error) {
      options.warnings.push(
        `demand_evidence_collection unavailable: ${errorMessage(error)}`,
      );
      return [];
    }
  }

  private async latestSerpSnapshots(topicId: string): Promise<SerpSnapshotRow[]> {
    return this.db.knex<SerpSnapshotRow>('serp_snapshots')
      .where({ topic_id: topicId })
      .orderBy('captured_at', 'desc')
      .limit(20);
  }

  private async latestDocumentVersions(topicId: string): Promise<DocumentVersionRow[]> {
    return this.db.knex<DocumentVersionRow>('document_versions')
      .where({ topic_id: topicId })
      .orderBy('created_at', 'desc')
      .limit(80);
  }

  private async entityVocabulary(options: {
    seedQuery: string;
    language: string | undefined;
    geo: SerpGeoTarget & { city?: string };
    warnings: string[];
  }): Promise<string[]> {
    try {
      const pack = await this.entityEnrichment.enrich({
        entityName: options.seedQuery,
        language: options.language,
        geo: options.geo,
        requestedCapabilities: [
          'entity_lookup',
          'aliases',
          'multilingual_aliases',
          'entity_types',
        ],
      });
      options.warnings.push(...pack.warnings.map((warning) =>
        `entity_enrichment:${warning.providerKey}: ${warning.message}`,
      ));
      return unique(pack.candidates.flatMap((candidate) => [
        candidate.name,
        ...candidate.aliases,
        ...candidate.types,
      ]))
        .filter((value) => value.length > 2)
        .slice(0, 20);
    } catch (error) {
      options.warnings.push(
        `entity_enrichment unavailable: ${errorMessage(error)}`,
      );
      return [];
    }
  }
}

function isWorkEligibleTopic(topic: TopicRecord): boolean {
  return topic.status === 'draft' || topic.status === 'active';
}

function serpDiscoveryMessage(
  result: AutomaticFocusedSerpDiscoveryApiResult,
): string {
  if (result.status === 'recorded') {
    return `Recorded SERP and submitted ${result.observations.submitted} URL observations.`;
  }
  return `SERP discovery degraded: ${result.warnings.join(' ')}`;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = value ? Number(value) : fallback;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type TopicRecordLike = TopicRecord;

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

function inferCity(seedQuery: string): string | undefined {
  const words = seedQuery.trim().split(/\s+/u);
  const last = words.at(-1);
  return last && words.length > 2 ? last : undefined;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

interface SerpSnapshotRow {
  query: string;
  normalized_query: string;
  results: unknown;
  snapshot: unknown;
}

interface DocumentVersionRow {
  requested_url: string;
  final_url: string | null;
  title: string | null;
  meta_description: string | null;
  metadata: unknown;
  structured_data: unknown;
}

interface SnapshotLike {
  query?: string;
  normalizedQuery?: string;
  results?: Array<{
    url?: string;
    title?: string | null;
    snippet?: string | null;
  }>;
  features?: {
    peopleAlsoAsk?: string[];
    relatedSearches?: string[];
    autocompleteSuggestions?: string[];
  };
}

function serpEvidenceObservations(
  row: SerpSnapshotRow,
  seedQuery: string,
): DemandObservation[] {
  const snapshot = parseJson<SnapshotLike>(row.snapshot) ?? {};
  const sourceQuery = snapshot.query ?? row.normalized_query;
  const observations: DemandObservation[] = [];
  for (const text of snapshot.features?.peopleAlsoAsk ?? []) {
    observations.push(observation(text, 'people_also_ask', sourceQuery));
  }
  for (const text of snapshot.features?.relatedSearches ?? []) {
    observations.push(observation(text, 'related_search', sourceQuery));
  }
  for (const text of snapshot.features?.autocompleteSuggestions ?? []) {
    observations.push(observation(text, 'autocomplete', sourceQuery));
  }
  for (const result of snapshot.results ?? parseJson<SnapshotLike['results']>(row.results) ?? []) {
    const evidenceUrl = result.url ?? null;
    for (const text of [result.title, result.snippet]) {
      for (const phrase of candidatePhrases(text, seedQuery)) {
        observations.push(observation(
          phrase,
          'serp_snippet',
          sourceQuery,
          evidenceUrl,
        ));
      }
    }
  }
  return observations;
}

function documentEvidenceObservations(
  row: DocumentVersionRow,
  seedQuery: string,
): DemandObservation[] {
  const sourceQuery = seedQuery;
  const evidenceUrl = row.final_url ?? row.requested_url;
  const metadata = parseJson<DocumentMetadataLike>(row.metadata) ?? {};
  const observations: DemandObservation[] = [];
  for (const text of [row.title, row.meta_description]) {
    for (const phrase of candidatePhrases(text, seedQuery)) {
      observations.push(observation(
        phrase,
        'serp_snippet',
        sourceQuery,
        evidenceUrl,
      ));
    }
  }
  for (const heading of metadata.headings ?? []) {
    for (const phrase of candidatePhrases(heading.text, seedQuery)) {
      observations.push(observation(
        phrase,
        'competitor_heading',
        sourceQuery,
        evidenceUrl,
      ));
    }
  }
  for (const question of faqQuestions(parseJson<unknown[]>(row.structured_data) ?? [])) {
    observations.push(observation(
      question,
      'faq_block',
      sourceQuery,
      evidenceUrl,
    ));
  }
  return observations;
}

interface DocumentMetadataLike {
  headings?: Array<{ text?: string | null }>;
}

function observation(
  observedText: string,
  evidenceType: DemandObservation['evidenceType'],
  sourceQuery: string,
  evidenceUrl?: string | null,
): DemandObservation {
  return {
    observedText,
    sourceTier: 'owned_data',
    providerKey: 'topic_work_evidence',
    evidenceType,
    sourceQuery,
    evidenceUrl,
  };
}

function candidatePhrases(
  value: string | null | undefined,
  seedQuery: string,
): string[] {
  if (!value) {
    return [];
  }
  const seedTokens = meaningfulTokens(seedQuery);
  return unique(value
    .split(/[|:;()\[\]{}<>]/u)
    .flatMap((part) => part.split(/\s[-–—]\s/u))
    .map((part) => cleanPhrase(part))
    .filter((phrase) =>
      phrase.length >= 3 &&
      phrase.length <= 90 &&
      phrase.split(/\s+/u).length <= 8 &&
      !looksLikeMarketingCopy(phrase) &&
      hasSeedOverlap(phrase, seedTokens),
    ))
    .slice(0, 8);
}

function cleanPhrase(value: string): string {
  return value
    .replace(/\b(19|20)\d{2}\b/gu, '')
    .replace(/[™®©]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function looksLikeMarketingCopy(value: string): boolean {
  const normalized = value.toLowerCase();
  return /\b(sprawdź|sprawdz|wejdź|wejdz|znajdź|znajdz|kupuj|taniej|promocj|oferujemy|najwięcej ofert|najwiecej ofert|radość|radosc|best prices|find what|shop now)\b/u
    .test(normalized);
}

function meaningfulTokens(value: string): Set<string> {
  return new Set(value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .split(/[^a-z0-9ąćęłńóśźż]+/iu)
    .filter((token) => token.length >= 3));
}

function hasSeedOverlap(phrase: string, seedTokens: Set<string>): boolean {
  if (seedTokens.size === 0) {
    return false;
  }
  const phraseTokens = meaningfulTokens(phrase);
  const overlap = [...seedTokens].filter((token) => phraseTokens.has(token)).length;
  return overlap >= Math.min(2, seedTokens.size);
}

function faqQuestions(values: unknown[]): string[] {
  return unique(values.flatMap((value) => faqQuestionsFromValue(value)));
}

function faqQuestionsFromValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(faqQuestionsFromValue);
  }
  if (!isRecord(value)) {
    return [];
  }
  const type = jsonLdType(value['@type']).toLowerCase();
  const direct = type === 'question' && typeof value.name === 'string'
    ? [value.name]
    : [];
  return [
    ...direct,
    ...faqQuestionsFromValue(value.mainEntity),
    ...faqQuestionsFromValue(value.acceptedAnswer),
  ];
}

function jsonLdType(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').join(' ');
  }
  return '';
}

function uniqueObservations(values: DemandObservation[]): DemandObservation[] {
  const seen = new Set<string>();
  const result: DemandObservation[] = [];
  for (const value of values) {
    const key = [
      value.observedText.toLowerCase(),
      value.evidenceType,
      value.evidenceUrl ?? '',
    ].join('|');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }
  return result;
}

function parseJson<Value>(value: unknown): Value | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Value;
    } catch {
      return null;
    }
  }
  return value as Value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ł/gu, 'l')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '') || 'seed';
}

function titleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/gu, ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function candidateKeyForPage(page: DemandCandidatePageRecord): string {
  return `candidate:${slugify(page.primaryKeyword)}`;
}

function seoPackRequestForPage(
  topic: TopicRecordLike,
  page: DemandCandidatePageRecord,
  candidateKey: string,
) {
  const primaryGeo = topic.discovery.search.queries[0]?.geo ??
    topic.languageGeo.geoTargets[0];
  const profile = seoPackProfileForPage(page);
  const sourceReferences = sourceReferencesForPage(page);
  const intentLabel = intentLabelForPage(page);

  return {
    topicId: topic.id,
    candidateKey,
    language: topicLanguage(topic),
    geo: primaryGeo ? {
      country: primaryGeo.countryCode,
      region: primaryGeo.regionCode,
    } : undefined,
    profile,
    demandPack: {
      packId: page.id,
      primaryKeyword: page.primaryKeyword,
      candidateLabel: page.clusterLabel ?? titleCase(page.primaryKeyword),
      keywordCluster: [
        page.primaryKeyword,
        ...page.supportingKeywords,
      ],
      demandSummary: demandSummaryForPage(page),
      nullableMetricsWarning: 'Paid keyword metrics are unavailable in the current free-provider workflow.',
      warnings: [
        ...page.missingMetrics.map((metric) => `Missing demand metric: ${metric}.`),
        ...(page.missingResearchGaps ?? []).map((gap) => `Missing research evidence: ${gap}.`),
      ],
      degraded: page.missingMetrics.length > 0 ||
        (page.missingResearchGaps ?? []).length > 0,
    },
    serpPack: {
      summary: sourceReferences.length > 0
        ? `SERP validation found ${sourceReferences.length} evidence URLs for this candidate page.`
        : 'Candidate page is marked ready, but no SERP evidence URLs are available.',
      competitorInsights: sourceReferences.slice(0, 10).map((reference) => ({
        insight: `SERP evidence source: ${reference.url}`,
        sourceReferences: [reference],
        confidence: 'low' as const,
      })),
      contentDepthExpectation: contentDepthExpectationForPage(page),
      warnings: [
        'SEO Pack generated automatically from Demand candidate page evidence; verify before production content decisions.',
      ],
      degraded: true,
    },
    serpIntentPack: {
      intents: [{
        intentId: `intent:${slugify(page.primaryIntent ?? page.proposedPageType)}`,
        label: intentLabel,
        priority: 'mandatory' as const,
        confidence: page.confidence === 'high' ? 'high' as const : 'medium' as const,
      }],
      degraded: true,
    },
    candidateScoringPack: {
      scoredCandidates: [{
        candidateKey,
        label: page.clusterLabel ?? titleCase(page.primaryKeyword),
        normalizedConcept: page.clusterKey ?? page.slug,
        recommendedPageType: profile,
        confidence: page.confidence === 'high' ? 'high' as const : 'medium' as const,
        rationale: [
          `Demand candidate page is marked ${page.readiness}.`,
          `Primary intent: ${page.primaryIntent ?? 'unknown'}.`,
          `${sourceReferences.length} SERP evidence URLs are attached.`,
        ],
        focusedResearchHints: page.missingResearchGaps ?? [],
        degraded: true,
      }],
      degraded: true,
    },
    researchAssets: sourceReferences.map((reference) => ({
      assetId: reference.sourceId,
      assetType: 'serp_evidence',
      title: reference.title,
      sourceReferences: [reference],
    })),
    warnings: [
      'Automatically generated from ready Demand candidate page.',
      'Knowledge Pack and paid demand metrics may still be missing.',
    ],
    degraded: true,
  };
}

function seoPackProfileForPage(
  page: DemandCandidatePageRecord,
): SeoPackProfileName {
  switch (page.proposedPageType) {
    case 'comparison':
      return 'comparison_page';
    case 'faq':
      return 'faq_page';
    case 'guide':
      return 'guide';
    case 'local_page':
      return 'local_page';
    case 'landing_page':
    default:
      return page.primaryIntent?.includes('commercial') ||
        page.primaryIntent === 'price' ||
        page.primaryIntent === 'audience'
        ? 'local_page'
        : 'landing_page';
  }
}

function sourceReferencesForPage(
  page: DemandCandidatePageRecord,
): SeoPackSourceReference[] {
  return (page.evidenceUrls ?? []).map((url, index) => ({
    sourceId: `demand-serp:${page.id}:${index + 1}`,
    sourceType: 'serp_evidence',
    url,
    title: hostFromUrl(url) ?? url,
  }));
}

function hostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function demandSummaryForPage(page: DemandCandidatePageRecord): string {
  const supporting = page.supportingKeywords.length > 0
    ? ` Supporting keywords: ${page.supportingKeywords.slice(0, 8).join(', ')}.`
    : '';
  return [
    `Ready candidate page for "${page.primaryKeyword}".`,
    `Cluster: ${page.clusterLabel ?? page.clusterKey ?? page.slug}.`,
    `Evidence types: ${page.evidenceTypes.join(', ') || 'unknown'}.`,
    supporting,
  ].join(' ').replace(/\s+/gu, ' ').trim();
}

function contentDepthExpectationForPage(page: DemandCandidatePageRecord): string {
  if (page.proposedPageType === 'comparison') {
    return 'Compare alternatives clearly, explain decision criteria and map recommendations to local search intent.';
  }
  if (page.proposedPageType === 'guide') {
    return 'Explain the process, requirements, risks, preparation, aftercare and booking implications with evidence-backed detail.';
  }
  if (page.proposedPageType === 'faq') {
    return 'Answer clustered questions directly and cite evidence-backed constraints where facts are still uncertain.';
  }
  if (page.primaryIntent?.includes('price') || page.primaryIntent === 'price') {
    return 'Cover pricing intent, what changes price, package logic, trust signals and booking next steps.';
  }
  return 'Cover the primary intent, local relevance, service details, proof, objections and booking path.';
}

function intentLabelForPage(page: DemandCandidatePageRecord): string {
  if (page.primaryIntent) {
    return `${page.primaryIntent.replace(/_/gu, ' ')}: ${page.primaryKeyword}`;
  }
  return `Cover ${page.primaryKeyword}`;
}

const validationBucketOrder = [
  'seed',
  'price',
  'local_commercial',
  'audience',
  'safety',
  'preparation',
  'aftercare',
  'comparison',
  'proof',
  'faq',
  'generic',
];

function selectTopicUniverseSerpQueries(
  pages: DemandCandidatePageRecord[],
  limit: number,
): string[] {
  const buckets = new Map<string, DemandCandidatePageRecord[]>();
  for (const page of [...pages].sort(compareValidationPagePriority)) {
    const bucket = validationBucket(page);
    buckets.set(bucket, [...(buckets.get(bucket) ?? []), page]);
  }

  const queries: string[] = [];
  const seenQueries = new Set<string>();
  const orderedBuckets = [
    ...validationBucketOrder,
    ...[...buckets.keys()]
      .filter((bucket) => !validationBucketOrder.includes(bucket))
      .sort(),
  ];

  while (queries.length < limit) {
    let progressed = false;
    for (const bucket of orderedBuckets) {
      const page = buckets.get(bucket)?.shift();
      if (!page) {
        continue;
      }
      progressed = true;
      const query = page.primaryKeyword.trim();
      const normalized = query.toLowerCase();
      if (query.length === 0 || seenQueries.has(normalized)) {
        continue;
      }
      seenQueries.add(normalized);
      queries.push(query);
      if (queries.length >= limit) {
        break;
      }
    }
    if (!progressed) {
      break;
    }
  }

  return queries;
}

function compareValidationPagePriority(
  left: DemandCandidatePageRecord,
  right: DemandCandidatePageRecord,
): number {
  return validationEvidenceScore(left) - validationEvidenceScore(right) ||
    readinessScore(left) - readinessScore(right) ||
    left.primaryKeyword.localeCompare(right.primaryKeyword);
}

function validationEvidenceScore(page: DemandCandidatePageRecord): number {
  return needsSerpValidation(page) ? 0 : 1;
}

function needsSerpValidation(page: DemandCandidatePageRecord): boolean {
  return !(page.evidenceTypes ?? []).includes('serp_snippet') &&
    (page.evidenceUrls ?? []).length === 0;
}

function readinessScore(page: DemandCandidatePageRecord): number {
  if (page.readiness === 'not_ready') {
    return 0;
  }
  if (page.readiness === 'partial') {
    return 1;
  }
  if (page.readiness === 'ready') {
    return 2;
  }
  return 0;
}

function validationBucket(page: DemandCandidatePageRecord): string {
  const intent = page.primaryIntent ?? '';
  const cluster = page.clusterKey ?? '';
  const keyword = page.primaryKeyword.toLowerCase();
  const haystack = `${intent} ${cluster} ${keyword}`;

  if ((page.evidenceTypes ?? []).includes('topic_seed')) {
    return 'seed';
  }
  if (haystack.includes('price') || priceTerms.some((term) => keyword.includes(term))) {
    return 'price';
  }
  if (haystack.includes('audience') || audienceTerms.some((term) => keyword.includes(term))) {
    return 'audience';
  }
  if (haystack.includes('safety') || safetyTerms.some((term) => keyword.includes(term))) {
    return 'safety';
  }
  if (haystack.includes('preparation') || preparationTerms.some((term) => keyword.includes(term))) {
    return 'preparation';
  }
  if (haystack.includes('aftercare') || aftercareTerms.some((term) => keyword.includes(term))) {
    return 'aftercare';
  }
  if (
    page.proposedPageType === 'comparison' ||
    haystack.includes('comparison') ||
    comparisonTerms.some((term) => keyword.includes(term))
  ) {
    return 'comparison';
  }
  if (haystack.includes('proof') || proofTerms.some((term) => keyword.includes(term))) {
    return 'proof';
  }
  if (
    page.proposedPageType === 'faq' ||
    haystack.includes('question') ||
    questionTerms.some((term) => keyword.includes(term))
  ) {
    return 'faq';
  }
  if (haystack.includes('commercial') || page.proposedPageType === 'local_page') {
    return 'local_commercial';
  }
  return 'generic';
}

const priceTerms = ['cena', 'cennik', 'koszt', 'ile kosztuje', 'price', 'cost'];
const audienceTerms = [
  'mężczyzn',
  'mezczyzn',
  'kobiet',
  'nastolat',
  'skóry wrażliwej',
  'skory wrazliwej',
  'men',
  'women',
];
const safetyTerms = [
  'bezpieczne',
  'przeciwwskazania',
  'skutki uboczne',
  'ciąża',
  'ciaza',
  'safe',
  'contraindications',
];
const preparationTerms = [
  'przygotowanie',
  'przygotować',
  'przygotowac',
  'czego nie robić przed',
  'czego nie robic przed',
  'preparation',
];
const aftercareTerms = [
  'po zabiegu',
  'zalecenia po',
  'czego nie robić po',
  'czego nie robic po',
  'aftercare',
];
const comparisonTerms = [' vs', 'różnice', 'roznice', 'czy lepsze', 'porównanie', 'porownanie'];
const proofTerms = ['opinie', 'przed i po', 'efekty', 'zdjęcia', 'zdjecia', 'reviews', 'results'];
const questionTerms = ['czy ', 'jak ', 'ile ', 'faq', 'pytania'];
