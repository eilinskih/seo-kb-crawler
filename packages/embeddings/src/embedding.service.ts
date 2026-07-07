import { Inject, Injectable } from '@nestjs/common';
import {
  EmbeddingProvider,
  EmbeddingProviderUnavailableError,
} from './domain/embedding-provider';
import {
  ChunkForEmbedding,
  EmbeddingBatchResult,
  EmbeddingDistanceMetric,
  EmbeddingFailure,
  EmbeddingModelIdentity,
  EmbeddingRepository,
} from './domain/embedding-types';
import { EMBEDDING_PROVIDER, EMBEDDING_REPOSITORY } from './embedding.tokens';

export interface EmbedBatchCommand {
  chunkIds: string[];
  now: Date;
  minTokenCount?: number;
  distanceMetric?: EmbeddingDistanceMetric;
  languageProfile?: string;
}

@Injectable()
export class EmbeddingService {
  constructor(
    @Inject(EMBEDDING_REPOSITORY)
    private readonly repository: EmbeddingRepository,
    @Inject(EMBEDDING_PROVIDER)
    private readonly provider: EmbeddingProvider,
  ) {}

  async findCandidates(options: {
    limit: number;
    minTokenCount?: number;
  }): Promise<ChunkForEmbedding[]> {
    return this.repository.findEmbeddingCandidates(this.provider.identity, {
      limit: options.limit,
      minTokenCount: options.minTokenCount ?? 1,
    });
  }

  async embedBatch(command: EmbedBatchCommand): Promise<EmbeddingBatchResult> {
    const model = await this.repository.upsertEmbeddingModel(
      this.provider.identity,
      {
        distanceMetric: command.distanceMetric ?? 'cosine',
        languageProfile: command.languageProfile ?? 'multilingual',
        now: command.now,
      },
    );
    const chunks = await this.repository.findChunksByIds(command.chunkIds);
    const { embeddable, skipped } = partitionEmbeddableChunks(
      chunks,
      command.minTokenCount ?? 1,
    );

    if (skipped.length > 0) {
      await this.repository.markChunksSkipped(
        model,
        skipped,
        {
          category: 'low_value_chunk',
          detail: 'Chunk is empty or below the configured token threshold',
          retryable: false,
        },
        { now: command.now },
      );
    }

    if (embeddable.length === 0) {
      return {
        status: 'empty',
        embeddingModelId: model.id,
        embeddedCount: 0,
        skippedCount: skipped.length,
        failedCount: 0,
      };
    }

    try {
      const results = await this.provider.embed(
        embeddable.map((chunk) => ({ chunk })),
      );
      const vectorsByChunkId = new Map(
        results.map((result) => [result.chunkId, result.vector]),
      );
      assertVectorDimensions(vectorsByChunkId, this.provider.identity);
      const saved = await this.repository.saveEmbeddingBatch(
        model,
        embeddable,
        vectorsByChunkId,
        { now: command.now },
      );
      return {
        ...saved,
        skippedCount: saved.skippedCount + skipped.length,
      };
    } catch (error) {
      const failure = failureFor(error);
      const saved = await this.repository.markEmbeddingFailures(
        model,
        embeddable,
        failure,
        { now: command.now },
      );
      return {
        ...saved,
        status: failure.category === 'provider_unavailable'
          ? 'provider_unavailable'
          : saved.status,
        skippedCount: saved.skippedCount + skipped.length,
      };
    }
  }
}

function partitionEmbeddableChunks(
  chunks: ChunkForEmbedding[],
  minTokenCount: number,
): {
  embeddable: ChunkForEmbedding[];
  skipped: ChunkForEmbedding[];
} {
  const embeddable = chunks.filter((chunk) =>
    chunk.text.trim() && chunk.tokenCount >= minTokenCount,
  );
  return {
    embeddable,
    skipped: chunks.filter((chunk) => !embeddable.includes(chunk)),
  };
}

function assertVectorDimensions(
  vectorsByChunkId: Map<string, number[]>,
  identity: EmbeddingModelIdentity,
): void {
  for (const [chunkId, vector] of vectorsByChunkId) {
    if (vector.length !== identity.dimensions) {
      throw new Error(
        `Embedding vector for chunk ${chunkId} has ${vector.length} dimensions; expected ${identity.dimensions}`,
      );
    }
  }
}

function failureFor(error: unknown): EmbeddingFailure {
  if (error instanceof EmbeddingProviderUnavailableError) {
    return {
      category: 'provider_unavailable',
      detail: error.message,
      retryable: true,
    };
  }
  if (error instanceof Error && error.message.includes('dimensions')) {
    return {
      category: 'dimension_mismatch',
      detail: error.message,
      retryable: false,
    };
  }
  return {
    category: 'provider_error',
    detail: error instanceof Error ? error.message : 'Unknown provider error',
    retryable: true,
  };
}
