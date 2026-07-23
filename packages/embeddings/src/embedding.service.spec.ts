import {
  ChunkEmbeddingRecord,
  ChunkForEmbedding,
  EmbeddingBatchResult,
  EmbeddingFailure,
  EmbeddingModelIdentity,
  EmbeddingModelRecord,
  EmbeddingRepository,
} from './domain/embedding-types';
import { NoEmbeddingProvider } from './domain/no-embedding.provider';
import { EmbeddingService } from './embedding.service';
import { StaticEmbeddingProvider } from './testing/static-embedding.provider';
import {
  chunkForEmbeddingFixture,
  testEmbeddingIdentity,
} from './testing/embedding.fixture';

describe('EmbeddingService', () => {
  const now = new Date('2026-07-07T09:00:00Z');

  it('stores embeddings idempotently for the same model and chunk hash', async () => {
    const chunk = chunkForEmbeddingFixture();
    const repository = new InMemoryEmbeddingRepository([chunk]);
    const provider = new StaticEmbeddingProvider(testEmbeddingIdentity);
    const service = new EmbeddingService(repository, provider);

    const first = await service.embedBatch({ chunkIds: [chunk.id], now });
    const second = await service.embedBatch({ chunkIds: [chunk.id], now });

    expect(first.embeddedCount).toBe(1);
    expect(second.embeddedCount).toBe(1);
    expect(repository.embeddings).toHaveLength(1);
    expect(repository.embeddings[0]).toMatchObject({
      chunkId: 'chunk-1',
      status: 'embedded',
      chunkContentHash: 'content-hash-1',
    });
  });

  it('records retryable failures when no provider is configured', async () => {
    const chunk = chunkForEmbeddingFixture();
    const repository = new InMemoryEmbeddingRepository([chunk]);
    const service = new EmbeddingService(
      repository,
      new NoEmbeddingProvider(),
    );

    const result = await service.embedBatch({ chunkIds: [chunk.id], now });

    expect(result.status).toBe('provider_unavailable');
    expect(repository.embeddings[0]).toMatchObject({
      status: 'failed_retryable',
      failure: {
        category: 'provider_unavailable',
        retryable: true,
      },
    });
  });

  it('allows multiple embeddings per chunk for model-version migration', async () => {
    const chunk = chunkForEmbeddingFixture();
    const repository = new InMemoryEmbeddingRepository([chunk]);
    const v1 = new EmbeddingService(
      repository,
      new StaticEmbeddingProvider(testEmbeddingIdentity),
    );
    const v2 = new EmbeddingService(
      repository,
      new StaticEmbeddingProvider({
        ...testEmbeddingIdentity,
        modelVersion: '2',
      }),
    );

    await v1.embedBatch({ chunkIds: [chunk.id], now });
    await v2.embedBatch({ chunkIds: [chunk.id], now });

    expect(repository.embeddings).toHaveLength(2);
    expect(repository.embeddings.map((embedding) =>
      repository.models.find((model) => model.id === embedding.embeddingModelId)
        ?.modelVersion,
    )).toEqual(['1', '2']);
  });

  it('skips low-value chunks before calling the provider', async () => {
    const chunk = chunkForEmbeddingFixture({
      id: 'chunk-empty',
      text: '   ',
      tokenCount: 0,
    });
    const repository = new InMemoryEmbeddingRepository([chunk]);
    const provider = new StaticEmbeddingProvider(testEmbeddingIdentity);
    const service = new EmbeddingService(repository, provider);

    const result = await service.embedBatch({
      chunkIds: [chunk.id],
      now,
      minTokenCount: 1,
    });

    expect(result.status).toBe('empty');
    expect(provider.calls).toBe(0);
    expect(repository.embeddings[0]).toMatchObject({
      status: 'skipped',
      failure: {
        category: 'low_value_chunk',
        retryable: false,
      },
    });
  });

  it('selects chunks missing current embeddings or needing retry', async () => {
    const current = chunkForEmbeddingFixture({ id: 'current' });
    const retryable = chunkForEmbeddingFixture({
      id: 'retryable',
      contentHash: 'content-hash-2',
    });
    const repository = new InMemoryEmbeddingRepository([current, retryable]);
    const service = new EmbeddingService(
      repository,
      new StaticEmbeddingProvider(testEmbeddingIdentity),
    );

    await service.embedBatch({ chunkIds: [current.id], now });
    await service.embedBatch({ chunkIds: [retryable.id], now });
    repository.embeddings.find((embedding) =>
      embedding.chunkId === retryable.id,
    )!.status = 'failed_retryable';

    const candidates = await service.findCandidates({ limit: 10 });

    expect(candidates.map((chunk) => chunk.id)).toEqual(['retryable']);
  });
});

class InMemoryEmbeddingRepository implements EmbeddingRepository {
  readonly models: EmbeddingModelRecord[] = [];
  readonly embeddings: ChunkEmbeddingRecord[] = [];

  constructor(private readonly chunks: ChunkForEmbedding[]) {}

  async upsertEmbeddingModel(
    identity: EmbeddingModelIdentity,
  ): Promise<EmbeddingModelRecord> {
    const existing = this.models.find((model) =>
      model.providerKey === identity.providerKey &&
      model.modelKey === identity.modelKey &&
      model.modelVersion === identity.modelVersion &&
      model.dimensions === identity.dimensions,
    );
    if (existing) {
      return existing;
    }

    const model: EmbeddingModelRecord = {
      id: `model-${this.models.length + 1}`,
      ...identity,
      distanceMetric: 'cosine',
      languageProfile: 'multilingual',
      status: 'active',
      createdAt: nowForTests(),
      updatedAt: nowForTests(),
    };
    this.models.push(model);
    return model;
  }

  async findEmbeddingCandidates(
    identity: EmbeddingModelIdentity,
    options: { limit: number; minTokenCount: number },
  ): Promise<ChunkForEmbedding[]> {
    const model = this.models.find((candidate) =>
      candidate.providerKey === identity.providerKey &&
      candidate.modelKey === identity.modelKey &&
      candidate.modelVersion === identity.modelVersion &&
      candidate.dimensions === identity.dimensions,
    );

    return this.chunks
      .filter((chunk) => chunk.tokenCount >= options.minTokenCount)
      .filter((chunk) => {
        if (!model) {
          return true;
        }
        const embedding = this.embeddings.find((candidate) =>
          candidate.chunkId === chunk.id &&
          candidate.embeddingModelId === model.id &&
          candidate.chunkContentHash === chunk.contentHash,
        );
        return !embedding || embedding.status === 'failed_retryable';
      })
      .slice(0, options.limit);
  }

  async findChunksByIds(chunkIds: string[]): Promise<ChunkForEmbedding[]> {
    return this.chunks.filter((chunk) => chunkIds.includes(chunk.id));
  }

  async saveEmbeddingBatch(
    model: EmbeddingModelRecord,
    chunks: ChunkForEmbedding[],
    vectorsByChunkId: Map<string, number[]>,
    options: { now: Date },
  ): Promise<EmbeddingBatchResult> {
    for (const chunk of chunks) {
      this.upsertEmbedding(model, chunk, {
        vector: vectorsByChunkId.get(chunk.id) ?? null,
        status: vectorsByChunkId.has(chunk.id)
          ? 'embedded'
          : 'failed_retryable',
        failure: null,
        embeddedAt: vectorsByChunkId.has(chunk.id) ? options.now : null,
        now: options.now,
      });
    }
    return {
      status: 'embedded',
      embeddingModelId: model.id,
      embeddedCount: chunks.length,
      skippedCount: 0,
      failedCount: 0,
    };
  }

  async markEmbeddingFailures(
    model: EmbeddingModelRecord,
    chunks: ChunkForEmbedding[],
    failure: EmbeddingFailure,
    options: { now: Date },
  ): Promise<EmbeddingBatchResult> {
    for (const chunk of chunks) {
      this.upsertEmbedding(model, chunk, {
        vector: null,
        status: failure.retryable ? 'failed_retryable' : 'failed_terminal',
        failure,
        embeddedAt: null,
        now: options.now,
      });
    }
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
    options: { now: Date },
  ): Promise<EmbeddingBatchResult> {
    for (const chunk of chunks) {
      this.upsertEmbedding(model, chunk, {
        vector: null,
        status: 'skipped',
        failure,
        embeddedAt: null,
        now: options.now,
      });
    }
    return {
      status: 'empty',
      embeddingModelId: model.id,
      embeddedCount: 0,
      skippedCount: chunks.length,
      failedCount: 0,
    };
  }

  async getEmbeddingStats() {
    return this.embeddings.map((embedding) => {
      const model = this.models.find((candidate) =>
        candidate.id === embedding.embeddingModelId,
      )!;
      return {
        embeddingModelId: model.id,
        providerKey: model.providerKey,
        modelKey: model.modelKey,
        modelVersion: model.modelVersion,
        dimensions: model.dimensions,
        language: embedding.language,
        status: embedding.status,
        count: 1,
      };
    });
  }

  async summarizeInspection() {
    return {
      recentEmbeddings: this.embeddings.map((embedding) => {
        const model = this.models.find((candidate) =>
          candidate.id === embedding.embeddingModelId,
        )!;
        return {
          embeddingId: embedding.id,
          chunkId: embedding.chunkId,
          topicId: embedding.topicId,
          documentVersionId: embedding.documentVersionId,
          providerKey: model.providerKey,
          modelKey: model.modelKey,
          modelVersion: model.modelVersion,
          dimensions: model.dimensions,
          status: embedding.status,
          language: embedding.language,
          chunkType: embedding.chunkType,
          embeddedAt: embedding.embeddedAt,
          updatedAt: embedding.updatedAt,
        };
      }),
    };
  }

  private upsertEmbedding(
    model: EmbeddingModelRecord,
    chunk: ChunkForEmbedding,
    input: {
      vector: number[] | null;
      status: ChunkEmbeddingRecord['status'];
      failure: EmbeddingFailure | null;
      embeddedAt: Date | null;
      now: Date;
    },
  ): void {
    const existing = this.embeddings.find((embedding) =>
      embedding.chunkId === chunk.id &&
      embedding.embeddingModelId === model.id &&
      embedding.chunkContentHash === chunk.contentHash,
    );
    const record: ChunkEmbeddingRecord = {
      id: existing?.id ?? `embedding-${this.embeddings.length + 1}`,
      chunkId: chunk.id,
      chunkingRunId: chunk.chunkingRunId,
      documentId: chunk.documentId,
      documentVersionId: chunk.documentVersionId,
      topicId: chunk.topicId,
      embeddingModelId: model.id,
      vector: input.vector,
      chunkContentHash: chunk.contentHash,
      chunkNormalizedTextHash: chunk.normalizedTextHash,
      language: chunk.language,
      geoHints: chunk.geoHints,
      chunkType: chunk.chunkType,
      status: input.status,
      failure: input.failure,
      embeddedAt: input.embeddedAt,
      createdAt: existing?.createdAt ?? input.now,
      updatedAt: input.now,
    };
    if (existing) {
      Object.assign(existing, record);
    } else {
      this.embeddings.push(record);
    }
  }
}

function nowForTests(): Date {
  return new Date('2026-07-07T09:00:00Z');
}
