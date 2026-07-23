import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  ChunkEmbeddingRecord,
  ChunkForEmbedding,
  EmbeddingBatchResult,
  EmbeddingFailure,
  EmbeddingModelRecord,
  EmbeddingRepository,
  EmbeddingStatus,
  EmbeddingModelIdentity,
  EmbeddingDistanceMetric,
  EmbeddingStatsRow,
  EmbeddingStatusSummary,
} from '../domain/embedding-types';

interface ChunkRow {
  id: string;
  chunking_run_id: string;
  document_id: string;
  document_version_id: string;
  topic_id: string;
  text: string;
  content_hash: string;
  normalized_text_hash: string;
  token_count: number;
  language: string | null;
  geo_hints: ChunkForEmbedding['geoHints'];
  chunk_type: ChunkForEmbedding['chunkType'];
}

interface EmbeddingModelRow {
  id: string;
  provider_key: string;
  model_key: string;
  model_version: string;
  dimensions: number;
  distance_metric: EmbeddingDistanceMetric;
  language_profile: string;
  status: EmbeddingModelRecord['status'];
  created_at: Date | string;
  updated_at: Date | string;
}

interface ChunkEmbeddingRow {
  id: string;
  chunk_id: string;
  chunking_run_id: string;
  document_id: string;
  document_version_id: string;
  topic_id: string;
  embedding_model_id: string;
  vector: string | null;
  chunk_content_hash: string;
  chunk_normalized_text_hash: string;
  language: string | null;
  geo_hints: ChunkEmbeddingRecord['geoHints'];
  chunk_type: ChunkEmbeddingRecord['chunkType'];
  status: EmbeddingStatus;
  failure: EmbeddingFailure | null;
  embedded_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

@Injectable()
export class KnexEmbeddingRepository implements EmbeddingRepository {
  constructor(private readonly db: DbService) {}

  async upsertEmbeddingModel(
    identity: EmbeddingModelIdentity,
    options: {
      distanceMetric: EmbeddingDistanceMetric;
      languageProfile: string;
      now: Date;
    },
  ): Promise<EmbeddingModelRecord> {
    const existing = await this.findModel(identity);
    const row: EmbeddingModelRow = {
      id: existing?.id ?? randomUUID(),
      provider_key: identity.providerKey,
      model_key: identity.modelKey,
      model_version: identity.modelVersion,
      dimensions: identity.dimensions,
      distance_metric: options.distanceMetric,
      language_profile: options.languageProfile,
      status: existing?.status ?? 'active',
      created_at: existing?.createdAt ?? options.now,
      updated_at: options.now,
    };

    await this.db.knex<EmbeddingModelRow>('embedding_models')
      .insert(row)
      .onConflict([
        'provider_key',
        'model_key',
        'model_version',
        'dimensions',
      ])
      .merge({
        distance_metric: row.distance_metric,
        language_profile: row.language_profile,
        updated_at: row.updated_at,
      });

    return toEmbeddingModel(row);
  }

  async findEmbeddingCandidates(
    identity: EmbeddingModelIdentity,
    options: {
      limit: number;
      minTokenCount: number;
    },
  ): Promise<ChunkForEmbedding[]> {
    const model = await this.findModel(identity);

    if (!model) {
      const rows = await this.db.knex<ChunkRow>('chunks')
        .where('chunks.token_count', '>=', options.minTokenCount)
        .orderBy('chunks.created_at', 'asc')
        .limit(options.limit)
        .select('chunks.*');
      return rows.map(toChunkForEmbedding);
    }

    const modelId = model.id;
    const knex = this.db.knex;
    const rows = await this.db.knex<ChunkRow>('chunks')
        .leftJoin<ChunkEmbeddingRow>('chunk_embeddings', function join() {
          this.on('chunks.id', '=', 'chunk_embeddings.chunk_id')
            .andOn(
              'chunk_embeddings.embedding_model_id',
              '=',
              knex.raw('?', [modelId]),
            )
            .andOn(
              'chunk_embeddings.chunk_content_hash',
              '=',
              'chunks.content_hash',
            );
        })
        .where((builder) =>
          builder
            .whereNull('chunk_embeddings.id')
            .orWhere('chunk_embeddings.status', 'failed_retryable'),
        )
        .where('chunks.token_count', '>=', options.minTokenCount)
        .orderBy('chunks.created_at', 'asc')
        .limit(options.limit)
        .select('chunks.*');
    return rows.map(toChunkForEmbedding);
  }

  async findChunksByIds(chunkIds: string[]): Promise<ChunkForEmbedding[]> {
    if (chunkIds.length === 0) {
      return [];
    }

    const rows = await this.db.knex<ChunkRow>('chunks')
      .whereIn('id', chunkIds)
      .orderBy('chunk_index', 'asc')
      .select('*');

    return rows.map(toChunkForEmbedding);
  }

  async saveEmbeddingBatch(
    model: EmbeddingModelRecord,
    chunks: ChunkForEmbedding[],
    vectorsByChunkId: Map<string, number[]>,
    options: {
      now: Date;
    },
  ): Promise<EmbeddingBatchResult> {
    await this.upsertEmbeddingRows(
      model,
      chunks,
      (chunk) => ({
        vector: vectorsByChunkId.get(chunk.id) ?? null,
        status: vectorsByChunkId.has(chunk.id)
          ? 'embedded'
          : 'failed_retryable',
        failure: vectorsByChunkId.has(chunk.id)
          ? null
          : {
              category: 'provider_error',
              detail: 'Provider did not return a vector for the chunk',
              retryable: true,
            },
        embedded_at: vectorsByChunkId.has(chunk.id) ? options.now : null,
      }),
      options.now,
    );

    return {
      status: 'embedded',
      embeddingModelId: model.id,
      embeddedCount: chunks.filter((chunk) => vectorsByChunkId.has(chunk.id))
        .length,
      skippedCount: 0,
      failedCount: chunks.filter((chunk) => !vectorsByChunkId.has(chunk.id))
        .length,
    };
  }

  async markEmbeddingFailures(
    model: EmbeddingModelRecord,
    chunks: ChunkForEmbedding[],
    failure: EmbeddingFailure,
    options: {
      now: Date;
    },
  ): Promise<EmbeddingBatchResult> {
    await this.upsertEmbeddingRows(
      model,
      chunks,
      () => ({
        vector: null,
        status: failure.retryable ? 'failed_retryable' : 'failed_terminal',
        failure,
        embedded_at: null,
      }),
      options.now,
    );

    return {
      status: failure.category === 'provider_unavailable'
        ? 'provider_unavailable'
        : 'failed',
      embeddingModelId: model.id,
      embeddedCount: 0,
      skippedCount: 0,
      failedCount: chunks.length,
    };
  }

  async markChunksSkipped(
    model: EmbeddingModelRecord,
    chunks: ChunkForEmbedding[],
    failure: EmbeddingFailure,
    options: {
      now: Date;
    },
  ): Promise<EmbeddingBatchResult> {
    await this.upsertEmbeddingRows(
      model,
      chunks,
      () => ({
        vector: null,
        status: 'skipped',
        failure,
        embedded_at: null,
      }),
      options.now,
    );

    return {
      status: 'empty',
      embeddingModelId: model.id,
      embeddedCount: 0,
      skippedCount: chunks.length,
      failedCount: 0,
    };
  }

  async getEmbeddingStats(): Promise<EmbeddingStatsRow[]> {
    const rows = await this.db.knex('chunk_embeddings')
      .join(
        'embedding_models',
        'chunk_embeddings.embedding_model_id',
        'embedding_models.id',
      )
      .select([
        'embedding_models.id as embedding_model_id',
        'embedding_models.provider_key',
        'embedding_models.model_key',
        'embedding_models.model_version',
        'embedding_models.dimensions',
        'chunk_embeddings.language',
        'chunk_embeddings.status',
      ])
      .count<{ count: string }[]>({ count: '*' })
      .groupBy([
        'embedding_models.id',
        'embedding_models.provider_key',
        'embedding_models.model_key',
        'embedding_models.model_version',
        'embedding_models.dimensions',
        'chunk_embeddings.language',
        'chunk_embeddings.status',
      ]);

    return rows.map((row) => ({
      embeddingModelId: row.embedding_model_id,
      providerKey: row.provider_key,
      modelKey: row.model_key,
      modelVersion: row.model_version,
      dimensions: Number(row.dimensions),
      language: row.language,
      status: row.status,
      count: Number(row.count),
    }));
  }

  async summarizeStatus(): Promise<EmbeddingStatusSummary> {
    const stats = await this.getEmbeddingStats();

    return {
      totalEmbeddings: stats.reduce((total, row) => total + row.count, 0),
      stats,
      retryableFailures: stats
        .filter((row) => row.status === 'failed_retryable')
        .reduce((total, row) => total + row.count, 0),
      terminalFailures: stats
        .filter((row) => row.status === 'failed_terminal')
        .reduce((total, row) => total + row.count, 0),
    };
  }

  private async findModel(
    identity: EmbeddingModelIdentity,
  ): Promise<EmbeddingModelRecord | null> {
    const row = await this.db.knex<EmbeddingModelRow>('embedding_models')
      .where({
        provider_key: identity.providerKey,
        model_key: identity.modelKey,
        model_version: identity.modelVersion,
        dimensions: identity.dimensions,
      })
      .first();

    return row ? toEmbeddingModel(row) : null;
  }

  private async upsertEmbeddingRows(
    model: EmbeddingModelRecord,
    chunks: ChunkForEmbedding[],
    valueFor: (chunk: ChunkForEmbedding) => {
      vector: number[] | null;
      status: EmbeddingStatus;
      failure: EmbeddingFailure | null;
      embedded_at: Date | null;
    },
    now: Date,
  ): Promise<void> {
    if (chunks.length === 0) {
      return;
    }

    await this.db.knex<ChunkEmbeddingRow>('chunk_embeddings')
      .insert(chunks.map((chunk) => {
        const values = valueFor(chunk);
        return {
          id: randomUUID(),
          chunk_id: chunk.id,
          chunking_run_id: chunk.chunkingRunId,
          document_id: chunk.documentId,
          document_version_id: chunk.documentVersionId,
          topic_id: chunk.topicId,
          embedding_model_id: model.id,
          vector: values.vector ? formatVector(values.vector) : null,
          chunk_content_hash: chunk.contentHash,
          chunk_normalized_text_hash: chunk.normalizedTextHash,
          language: chunk.language,
          geo_hints: chunk.geoHints,
          chunk_type: chunk.chunkType,
          status: values.status,
          failure: values.failure,
          embedded_at: values.embedded_at,
          created_at: now,
          updated_at: now,
        };
      }))
      .onConflict(['chunk_id', 'embedding_model_id', 'chunk_content_hash'])
      .merge({
        vector: this.db.knex.raw('excluded.vector'),
        status: this.db.knex.raw('excluded.status'),
        failure: this.db.knex.raw('excluded.failure'),
        embedded_at: this.db.knex.raw('excluded.embedded_at'),
        updated_at: now,
      });
  }

}

function toChunkForEmbedding(row: ChunkRow): ChunkForEmbedding {
  return {
    id: row.id,
    chunkingRunId: row.chunking_run_id,
    documentId: row.document_id,
    documentVersionId: row.document_version_id,
    topicId: row.topic_id,
    text: row.text,
    contentHash: row.content_hash,
    normalizedTextHash: row.normalized_text_hash,
    tokenCount: row.token_count,
    language: row.language,
    geoHints: row.geo_hints,
    chunkType: row.chunk_type,
  };
}

function toEmbeddingModel(row: EmbeddingModelRow): EmbeddingModelRecord {
  return {
    id: row.id,
    providerKey: row.provider_key,
    modelKey: row.model_key,
    modelVersion: row.model_version,
    dimensions: row.dimensions,
    distanceMetric: row.distance_metric,
    languageProfile: row.language_profile,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function formatVector(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
