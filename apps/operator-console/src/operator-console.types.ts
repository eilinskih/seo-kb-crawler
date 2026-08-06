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
  reviewQueues: OperatorReviewQueuesSummary;
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

export interface OperatorReviewQueuesSummary {
  suggestedAliases: OperatorSuggestedAliasReviewItem[];
  externalEntityIds: OperatorExternalEntityIdReviewItem[];
  enrichmentCandidates: OperatorEnrichmentCandidateReviewItem[];
}

export interface OperatorSuggestedAliasReviewItem {
  aliasId: string;
  entityId: string;
  aliasText: string;
  aliasType: string;
  language: string | null;
  confidence: number;
  reviewStatus: string;
}

export interface OperatorExternalEntityIdReviewItem {
  packId: string;
  entityName: string;
  providerKey: string;
  externalId: string;
  externalIdType: string;
  confidence: string;
  sourceUrl: string | null;
  observedAt: string | null;
}

export interface OperatorEnrichmentCandidateReviewItem {
  packId: string;
  entityName: string;
  providerKey: string;
  candidateName: string;
  externalId: string | null;
  externalIdType: string | null;
  confidence: string;
  sourceUrl: string | null;
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
  freshnessScore: number;
  recrawlReason: string;
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
  inspection: {
    recentDocuments: OperatorRecentDocument[];
    recentChunks: OperatorRecentChunk[];
    recentEmbeddings: OperatorRecentEmbedding[];
  };
}

export interface OperatorRecentDocument {
  documentId: string;
  documentVersionId: string;
  topicId: string;
  requestedUrl: string;
  finalUrl: string | null;
  title: string | null;
  wordCount: number | null;
  createdAt: string;
}

export interface OperatorRecentChunk {
  chunkId: string;
  topicId: string;
  documentVersionId: string;
  chunkType: string;
  tokenCount: number;
  language: string | null;
  textPreview: string;
  createdAt: string;
}

export interface OperatorRecentEmbedding {
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
