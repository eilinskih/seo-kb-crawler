import { GeoHint } from '@seo-kb/content-processing';
import { ChunkType } from '@seo-kb/chunking';

export type EmbeddingStatus =
  | 'pending'
  | 'embedding'
  | 'embedded'
  | 'skipped'
  | 'failed_retryable'
  | 'failed_terminal';

export type EmbeddingModelStatus = 'active' | 'deprecated' | 'retired';

export type EmbeddingDistanceMetric = 'cosine' | 'inner_product' | 'l2';

export type EmbeddingFailureCategory =
  | 'provider_unavailable'
  | 'provider_error'
  | 'empty_chunk'
  | 'low_value_chunk'
  | 'dimension_mismatch'
  | 'database_error'
  | 'internal_error';

export interface EmbeddingFailure {
  category: EmbeddingFailureCategory;
  detail: string;
  retryable: boolean;
}

export interface EmbeddingModelIdentity {
  providerKey: string;
  modelKey: string;
  modelVersion: string;
  dimensions: number;
}

export interface EmbeddingModelRecord extends EmbeddingModelIdentity {
  id: string;
  distanceMetric: EmbeddingDistanceMetric;
  languageProfile: string;
  status: EmbeddingModelStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChunkForEmbedding {
  id: string;
  chunkingRunId: string;
  documentId: string;
  documentVersionId: string;
  topicId: string;
  text: string;
  contentHash: string;
  normalizedTextHash: string;
  tokenCount: number;
  language: string | null;
  geoHints: GeoHint[];
  chunkType: ChunkType;
}

export interface EmbeddingJob {
  jobId: string;
  chunkIds: string[];
  providerKey: string;
  modelKey: string;
  modelVersion: string;
  dimensions: number;
  requestedAt: string;
}

export interface ChunkEmbeddingRecord {
  id: string;
  chunkId: string;
  chunkingRunId: string;
  documentId: string;
  documentVersionId: string;
  topicId: string;
  embeddingModelId: string;
  vector: number[] | null;
  chunkContentHash: string;
  chunkNormalizedTextHash: string;
  language: string | null;
  geoHints: GeoHint[];
  chunkType: ChunkType;
  status: EmbeddingStatus;
  failure: EmbeddingFailure | null;
  embeddedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmbeddingBatchResult {
  status: 'embedded' | 'provider_unavailable' | 'failed' | 'empty';
  embeddingModelId: string;
  embeddedCount: number;
  skippedCount: number;
  failedCount: number;
}

export interface EmbeddingStatsRow {
  embeddingModelId: string;
  providerKey: string;
  modelKey: string;
  modelVersion: string;
  dimensions: number;
  language: string | null;
  status: EmbeddingStatus;
  count: number;
}

export interface EmbeddingRepository {
  upsertEmbeddingModel(
    identity: EmbeddingModelIdentity,
    options: {
      distanceMetric: EmbeddingDistanceMetric;
      languageProfile: string;
      now: Date;
    },
  ): Promise<EmbeddingModelRecord>;
  findEmbeddingCandidates(
    identity: EmbeddingModelIdentity,
    options: {
      limit: number;
      minTokenCount: number;
    },
  ): Promise<ChunkForEmbedding[]>;
  findChunksByIds(chunkIds: string[]): Promise<ChunkForEmbedding[]>;
  saveEmbeddingBatch(
    model: EmbeddingModelRecord,
    chunks: ChunkForEmbedding[],
    vectorsByChunkId: Map<string, number[]>,
    options: {
      now: Date;
    },
  ): Promise<EmbeddingBatchResult>;
  markEmbeddingFailures(
    model: EmbeddingModelRecord,
    chunks: ChunkForEmbedding[],
    failure: EmbeddingFailure,
    options: {
      now: Date;
    },
  ): Promise<EmbeddingBatchResult>;
  markChunksSkipped(
    model: EmbeddingModelRecord,
    chunks: ChunkForEmbedding[],
    failure: EmbeddingFailure,
    options: {
      now: Date;
    },
  ): Promise<EmbeddingBatchResult>;
  getEmbeddingStats(): Promise<EmbeddingStatsRow[]>;
}

export interface EmbeddingStatusSummary {
  totalEmbeddings: number;
  stats: EmbeddingStatsRow[];
  retryableFailures: number;
  terminalFailures: number;
}
