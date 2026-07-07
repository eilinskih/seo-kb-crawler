import {
  ChunkingRepository,
  ChunkingRunIdentity,
  ChunkingRunRecord,
} from './domain/chunking-types';
import { documentVersionFixture } from './testing/chunking.fixture';
import { ChunkingService } from './chunking.service';

describe('ChunkingService', () => {
  it('chunks a document version and persists the generated plan', async () => {
    const repository = new InMemoryChunkingRepository();
    const service = new ChunkingService(repository);

    const result = await service.chunkDocumentVersion({
      documentVersionId: 'document-version-1',
      now: new Date('2026-07-07T02:00:00Z'),
    });

    expect(result.status).toBe('chunked');
    expect(result.chunkCount).toBeGreaterThan(0);
    expect(repository.savedPlans).toHaveLength(1);
  });

  it('returns already_chunked for an existing chunked run', async () => {
    const repository = new InMemoryChunkingRepository();
    repository.existingRun = {
      id: 'run-1',
      documentId: 'document-1',
      documentVersionId: 'document-version-1',
      topicId: 'topic-1',
      status: 'chunked',
      chunkerVersion: 'chunker-v1',
      chunkingProfile: 'short_seo_page',
      tokenizerKey: 'local-whitespace',
      tokenizerVersion: '1',
      failure: null,
      startedAt: new Date('2026-07-07T02:00:00Z'),
      completedAt: new Date('2026-07-07T02:00:00Z'),
      createdAt: new Date('2026-07-07T02:00:00Z'),
      updatedAt: new Date('2026-07-07T02:00:00Z'),
    };
    const service = new ChunkingService(repository);

    const result = await service.chunkDocumentVersion({
      documentVersionId: 'document-version-1',
      now: new Date('2026-07-07T02:10:00Z'),
    });

    expect(result.status).toBe('already_chunked');
    expect(result.runId).toBe('run-1');
    expect(repository.savedPlans).toHaveLength(0);
  });
});

class InMemoryChunkingRepository implements ChunkingRepository {
  readonly documentVersion = documentVersionFixture();
  readonly savedPlans: unknown[] = [];
  existingRun: ChunkingRunRecord | null = null;

  async findDocumentVersion() {
    return this.documentVersion;
  }

  async findRun(_identity: ChunkingRunIdentity) {
    return this.existingRun;
  }

  async saveChunkingPlan(plan: { chunks: unknown[] }) {
    this.savedPlans.push(plan);
    return {
      status: 'chunked' as const,
      runId: 'run-1',
      documentVersionId: this.documentVersion.id,
      chunkCount: plan.chunks.length,
    };
  }
}
