import {
  RetrievalCandidate,
  RetrievalQuery,
  RetrievalRepository,
} from './domain/retrieval-types';
import { RetrievalService } from './retrieval.service';
import {
  retrievalCandidateFixture,
  retrievalQueryFixture,
} from './testing/retrieval.fixture';

describe('RetrievalService', () => {
  it('returns vector-only results when vector candidates are available', async () => {
    const repository = new FakeRetrievalRepository({
      vector: [
        retrievalCandidateFixture({
          chunkId: 'vector-1',
          vectorScore: 0.9,
          modes: ['vector'],
        }),
      ],
    });
    const service = new RetrievalService(repository);

    const response = await service.search(retrievalQueryFixture());

    expect(response.degraded).toBe(false);
    expect(response.results[0]).toMatchObject({
      chunkId: 'vector-1',
      debug: {
        modes: ['vector'],
        rankingProfile: 'balanced',
      },
    });
    expect(response.results[0].scoreBreakdown.vector).toBe(0.9);
    expect(repository.vectorCalls[0]).toMatchObject({
      topicId: 'topic-1',
      language: 'en',
      geo: { countryCode: 'PL' },
      limit: 5,
    });
  });

  it('falls back to keyword retrieval when vector search is unavailable', async () => {
    const repository = new FakeRetrievalRepository({
      vectorError: new Error('embedding model not available'),
      keyword: [
        retrievalCandidateFixture({
          chunkId: 'keyword-1',
          keywordScore: 1,
          matchedTerms: ['laser', 'hair', 'removal'],
          modes: ['keyword'],
        }),
      ],
    });
    const service = new RetrievalService(repository);

    const response = await service.search(retrievalQueryFixture());

    expect(response.degraded).toBe(true);
    expect(response.warnings).toContain(
      'Vector retrieval unavailable: embedding model not available',
    );
    expect(response.results[0].chunkId).toBe('keyword-1');
    expect(response.results[0].scoreBreakdown.keyword).toBe(1);
  });

  it('combines hybrid candidates and collapses duplicate chunks', async () => {
    const repository = new FakeRetrievalRepository({
      vector: [
        retrievalCandidateFixture({
          chunkId: 'duplicate-vector',
          normalizedTextHash: 'same',
          vectorScore: 0.8,
          modes: ['vector'],
        }),
      ],
      keyword: [
        retrievalCandidateFixture({
          chunkId: 'duplicate-keyword',
          normalizedTextHash: 'same',
          keywordScore: 0.2,
          modes: ['keyword'],
        }),
        retrievalCandidateFixture({
          chunkId: 'keyword-unique',
          normalizedTextHash: 'unique',
          keywordScore: 1,
          matchedTerms: ['laser', 'hair', 'removal', 'warsaw'],
          modes: ['keyword'],
        }),
      ],
    });
    const service = new RetrievalService(repository);

    const response = await service.search(retrievalQueryFixture());

    expect(response.results.map((result) => result.chunkId)).toContain(
      'duplicate-vector',
    );
    const duplicate = response.results.find((result) =>
      result.chunkId === 'duplicate-vector',
    );
    expect(duplicate?.scoreBreakdown).toMatchObject({
      vector: 0.8,
      keyword: 0.2,
    });
    expect(duplicate?.debug?.modes).toEqual(['vector', 'keyword']);
    expect(duplicate?.matchedTerms).toEqual([]);
    expect(response.results.map((result) => result.chunkId)).not.toContain(
      'duplicate-keyword',
    );
  });

  it('uses broad metadata fallback only when explicitly allowed', async () => {
    const repository = new FakeRetrievalRepository({
      metadata: [
        retrievalCandidateFixture({
          chunkId: 'metadata-1',
          metadataScore: 1,
          modes: ['metadata'],
        }),
      ],
    });
    const service = new RetrievalService(repository);

    const withoutFallback = await service.search(retrievalQueryFixture());
    const withFallback = await service.search(
      retrievalQueryFixture({ allowBroadFallback: true }),
    );

    expect(withoutFallback.results).toHaveLength(0);
    expect(withFallback.results[0].chunkId).toBe('metadata-1');
    expect(repository.metadataCalls[0]).toMatchObject({
      topicId: 'topic-1',
      language: 'en',
      geo: { countryCode: 'PL' },
      limit: 5,
    });
  });

  it('returns warnings and no broad metadata results when primary modes fail', async () => {
    const repository = new FakeRetrievalRepository({
      vectorError: new Error('vector unavailable'),
      keywordError: new Error('keyword unavailable'),
      metadata: [
        retrievalCandidateFixture({
          chunkId: 'metadata-should-not-return',
          metadataScore: 1,
          modes: ['metadata'],
        }),
      ],
    });
    const service = new RetrievalService(repository);

    const response = await service.search(retrievalQueryFixture());

    expect(response.results).toHaveLength(0);
    expect(response.warnings).toContain(
      'Vector retrieval unavailable: vector unavailable',
    );
    expect(response.warnings).toContain(
      'Keyword retrieval unavailable: keyword unavailable',
    );
    expect(repository.metadataCalls).toHaveLength(0);
  });
});

class FakeRetrievalRepository implements RetrievalRepository {
  readonly vectorCalls: RetrievalQuery[] = [];
  readonly keywordCalls: RetrievalQuery[] = [];
  readonly metadataCalls: RetrievalQuery[] = [];

  constructor(private readonly input: {
    vector?: RetrievalCandidate[];
    keyword?: RetrievalCandidate[];
    metadata?: RetrievalCandidate[];
    vectorError?: Error;
    keywordError?: Error;
  }) {}

  async searchVector(query: RetrievalQuery): Promise<RetrievalCandidate[]> {
    this.vectorCalls.push(query);
    if (this.input.vectorError) {
      throw this.input.vectorError;
    }
    return this.input.vector ?? [];
  }

  async searchKeyword(query: RetrievalQuery): Promise<RetrievalCandidate[]> {
    this.keywordCalls.push(query);
    if (this.input.keywordError) {
      throw this.input.keywordError;
    }
    return this.input.keyword ?? [];
  }

  async searchMetadata(query: RetrievalQuery): Promise<RetrievalCandidate[]> {
    this.metadataCalls.push(query);
    return this.input.metadata ?? [];
  }
}
