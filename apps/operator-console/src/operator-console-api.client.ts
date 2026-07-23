import { Injectable } from '@nestjs/common';

export interface OperatorTopicRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'paused' | 'archived';
  configurationVersion: number;
  updatedAt: string;
  discovery?: {
    search?: {
      queries?: Array<{ text: string; language?: string; geo?: { countryCode?: string } }>;
    };
    seeds?: {
      urls?: string[];
    };
  };
  languageGeo?: {
    languages?: Array<{ tag: string }>;
    geoTargets?: Array<{ countryCode: string }>;
  };
  crawlPolicy?: {
    maxPages?: number;
  };
}

export interface OperatorCreateTopicCommand {
  slug: string;
  name: string;
  description: string | null;
  seedUrls: string[];
  seedKeywords: string[];
  language: string;
  countryCode: string;
  maxPages: number;
}

export interface OperatorUpdateTopicCommand extends OperatorCreateTopicCommand {
  expectedConfigurationVersion: number;
}

export interface OperatorDispatchCommand {
  maxDispatches: number;
}

export interface OperatorFrontierStatusSummary {
  topicId: string | null;
  totalEntries: number;
  counts: Array<{ status: string; count: number }>;
  retryableCount: number;
  recentEntries: Array<{
    id: string;
    topicId: string;
    normalizedUrl: string;
    crawlStatus: string;
    relevanceDecision: string;
    priorityScore: number;
    nextCrawlAt: string;
    leaseOwner: string | null;
    consecutiveFailures: number;
    updatedAt: string;
  }>;
}

export interface OperatorStatusSummary {
  contentProcessing: OperatorPipelineStageSummary;
  chunking: OperatorPipelineStageSummary & { totalChunks: number };
  embeddings: {
    totalEmbeddings: number;
    retryableFailures: number;
    terminalFailures: number;
    stats: Array<{
      providerKey: string;
      modelKey: string;
      modelVersion: string;
      language: string | null;
      status: string;
      count: number;
    }>;
  };
  retrieval: {
    totalChunks: number;
    embeddedChunks: number;
    keywordReady: boolean;
    vectorReady: boolean;
    degradedMode: boolean;
  };
  inspection: {
    recentDocuments: Array<{
      documentId: string;
      documentVersionId: string;
      topicId: string;
      requestedUrl: string;
      finalUrl: string | null;
      title: string | null;
      wordCount: number | null;
      createdAt: string;
    }>;
    recentChunks: Array<{
      chunkId: string;
      topicId: string;
      documentVersionId: string;
      chunkType: string;
      tokenCount: number;
      language: string | null;
      textPreview: string;
      createdAt: string;
    }>;
    recentEmbeddings: Array<{
      embeddingId: string;
      chunkId: string;
      topicId: string;
      documentVersionId: string;
      providerKey: string;
      modelKey: string;
      modelVersion: string;
      dimensions: number;
      status: string;
      language: string | null;
      chunkType: string;
      embeddedAt: string | null;
      updatedAt: string;
    }>;
  };
}

export interface OperatorPipelineStageSummary {
  totalRuns: number;
  counts: Array<{ status: string; count: number }>;
  retryableFailures: number;
  terminalFailures: number;
  recentFailures: Array<{
    status: string;
    category: string;
    detail: string;
    retryable: boolean;
    updatedAt: string;
  }>;
}

@Injectable()
export class OperatorConsoleApiClient {
  constructor(
    private readonly apiBaseUrl = normalizeBaseUrl(
      process.env.OPERATOR_CONSOLE_API_BASE_URL,
    ),
  ) {}

  async listTopics(): Promise<OperatorTopicRecord[]> {
    return this.request<OperatorTopicRecord[]>('/topics', {
      method: 'GET',
    });
  }

  async getFrontierStatus(): Promise<OperatorFrontierStatusSummary> {
    return this.request<OperatorFrontierStatusSummary>('/url-frontier/status', {
      method: 'GET',
    });
  }

  async getOperatorStatus(): Promise<OperatorStatusSummary> {
    return this.request<OperatorStatusSummary>('/operator/status', {
      method: 'GET',
    });
  }

  async createTopic(command: OperatorCreateTopicCommand): Promise<void> {
    await this.request('/topics', {
      method: 'POST',
      body: JSON.stringify(toCreateTopicInput(command)),
      headers: {
        'content-type': 'application/json',
      },
    });
  }

  async updateTopicConfiguration(
    topicId: string,
    command: OperatorUpdateTopicCommand,
  ): Promise<void> {
    await this.request(`/topics/${encodeURIComponent(topicId)}/configuration`, {
      method: 'PUT',
      body: JSON.stringify({
        ...toTopicConfigurationInput(command),
        name: command.name,
        description: command.description,
        expectedConfigurationVersion: command.expectedConfigurationVersion,
      }),
      headers: {
        'content-type': 'application/json',
      },
    });
  }

  async pauseTopic(topicId: string): Promise<void> {
    await this.postTopicTransition(topicId, 'pause');
  }

  async archiveTopic(topicId: string): Promise<void> {
    await this.postTopicTransition(topicId, 'archive');
  }

  async reactivateTopic(topicId: string): Promise<void> {
    await this.postTopicTransition(topicId, 'resume');
  }

  async dispatchUrlFrontier(command: OperatorDispatchCommand): Promise<void> {
    await this.request('/url-frontier/dispatch', {
      method: 'POST',
      body: JSON.stringify({
        leaseOwner: 'operator-console',
        maxDispatches: command.maxDispatches,
      }),
      headers: {
        'content-type': 'application/json',
      },
    });
  }

  async dispatchContentProcessing(
    command: OperatorDispatchCommand,
  ): Promise<void> {
    await this.request('/content-processing/dispatch', {
      method: 'POST',
      body: JSON.stringify({
        maxDispatches: command.maxDispatches,
      }),
      headers: {
        'content-type': 'application/json',
      },
    });
  }

  private async postTopicTransition(
    topicId: string,
    transition: 'pause' | 'archive' | 'resume',
  ): Promise<void> {
    await this.request(`/topics/${encodeURIComponent(topicId)}/${transition}`, {
      method: 'POST',
    });
  }

  private async request<Result>(
    path: string,
    init: RequestInit,
  ): Promise<Result> {
    const response = await fetch(`${this.apiBaseUrl}${path}`, init);
    if (!response.ok) {
      throw new Error(`${init.method ?? 'GET'} ${path} failed: ${response.status}`);
    }
    if (response.status === 204) {
      return undefined as Result;
    }
    return response.json() as Promise<Result>;
  }
}

function normalizeBaseUrl(value: string | undefined): string {
  return (value ?? 'http://127.0.0.1:3000').replace(/\/+$/u, '');
}

function toCreateTopicInput(command: OperatorCreateTopicCommand): Record<string, unknown> {
  return {
    slug: command.slug,
    name: command.name,
    description: command.description,
    ...toTopicConfigurationInput(command),
  };
}

function toTopicConfigurationInput(
  command: OperatorCreateTopicCommand,
): Record<string, unknown> {
  return {
    discovery: {
      schemaVersion: 1,
      search: {
        enabled: command.seedKeywords.length > 0,
        queries: command.seedKeywords.map((keyword) => ({
          text: keyword,
          language: command.language,
          geo: {
            countryCode: command.countryCode,
          },
        })),
        maxResultsPerQuery: 10,
      },
      sitemaps: {
        enabled: false,
        urls: [],
      },
      seeds: {
        enabled: command.seedUrls.length > 0,
        urls: command.seedUrls,
      },
    },
    languageGeo: {
      languages: [{
        tag: command.language,
        role: 'primary',
        minimumConfidence: 0.7,
      }],
      geoTargets: [{
        countryCode: command.countryCode,
        priority: 1,
      }],
      geoMode: 'targeted',
    },
    crawlPolicy: {
      allowedHosts: hostnames(command.seedUrls),
      deniedHosts: [],
      includedPathPatterns: [],
      excludedPathPatterns: [],
      ignoredQueryParameters: [
        'utm_source',
        'utm_medium',
        'utm_campaign',
      ],
      crossHostCanonicalPolicy: 'allowed-hosts',
      maxDepth: 2,
      maxPages: command.maxPages,
      maxRequestsPerMinutePerHost: 30,
      maxConcurrentRequestsPerHost: 2,
      requestTimeoutMs: 15_000,
      maxResponseBytes: 2_000_000,
      allowedContentTypes: ['text/html'],
      robotsPolicy: 'strict',
      renderMode: 'never',
      recrawlIntervalHours: 168,
      minRecrawlIntervalHours: 24,
      maxRecrawlIntervalHours: 720,
    },
    relevanceProfile: {
      minimumScore: 0.2,
      allowExploratoryCrawl: true,
      requiredTermGroups: [],
      excludedTerms: [],
      weightedTerms: command.seedKeywords.map((keyword) => ({
        term: keyword,
        weight: 1,
      })),
      fieldWeights: {
        url: 1,
        title: 3,
        headings: 2,
        body: 1,
        anchorText: 1,
      },
      hostAdjustments: [],
    },
    intentProfile: null,
  };
}

function hostnames(urls: string[]): string[] {
  return [...new Set(urls.map((url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }).filter((hostname): hostname is string => Boolean(hostname)))];
}
