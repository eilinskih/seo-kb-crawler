import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChunkingDispatchService } from '@seo-kb/chunking';
import { ContentProcessingDispatchService } from '@seo-kb/content-processing';
import { EmbeddingDispatchService } from '@seo-kb/embeddings';
import { FactExtractionDispatchService } from '@seo-kb/fact-extraction';
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
    | 'url_frontier_dispatch'
    | 'content_processing_dispatch'
    | 'chunking_dispatch'
    | 'embedding_dispatch'
    | 'fact_extraction_dispatch';
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
    private readonly topics: TopicService,
    private readonly serpDiscovery: FocusedSerpDiscoveryApiService,
    private readonly urlFrontierDispatch: UrlFrontierDispatchService,
    private readonly contentProcessingDispatch: ContentProcessingDispatchService,
    private readonly chunkingDispatch: ChunkingDispatchService,
    private readonly embeddingDispatch: EmbeddingDispatchService,
    private readonly factExtractionDispatch: FactExtractionDispatchService,
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
