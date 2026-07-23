export type OperatorConsoleActionMethod = 'GET' | 'POST' | 'PUT';

export interface OperatorConsoleAction {
  id: string;
  label: string;
  method: OperatorConsoleActionMethod;
  path: string;
  bounded: boolean;
  enabled: boolean;
  owner: string;
  note: string;
}

export interface OperatorConsoleSection {
  id: string;
  title: string;
  summary: string;
  status: 'available' | 'partial' | 'planned';
  actions: OperatorConsoleAction[];
}

export interface OperatorConsoleViewModel {
  generatedAt: string;
  title: string;
  subtitle: string;
  sections: OperatorConsoleSection[];
  warnings: string[];
  topics: OperatorTopicSummary[];
  providerStatuses: OperatorProviderStatusSummary[];
  frontierStatus: OperatorFrontierStatusSummary | null;
  operatorStatus: OperatorStatusSummary | null;
  flash: string | null;
}

export interface OperatorTopicSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
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

export interface OperatorProviderStatusSummary {
  providerKey: string;
  status: string;
  tier: string;
  capabilities: string[];
  warnings: string[];
}

export interface OperatorFrontierStatusSummary {
  topicId: string | null;
  totalEntries: number;
  counts: Array<{ status: string; count: number }>;
  retryableCount: number;
  recentEntries: OperatorFrontierRecentEntry[];
}

export interface OperatorFrontierRecentEntry {
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
