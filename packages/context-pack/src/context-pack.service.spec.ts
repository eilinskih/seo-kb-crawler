import { RetrievalService } from '@seo-kb/retrieval';
import { ContextPackService } from './context-pack.service';
import {
  retrievalResponseFixture,
  retrievalResultFixture,
} from './testing/context-pack.fixture';

describe('ContextPackService', () => {
  it('packages retrieval results deterministically into sections and sources', async () => {
    const retrieval = {
      search: jest.fn().mockResolvedValue(retrievalResponseFixture({
        results: [
          retrievalResultFixture({
            chunkId: 'chunk-lower-score',
            score: 0.2,
            sectionTitle: 'FAQ',
            text: 'Lower score text.',
          }),
          retrievalResultFixture({
            chunkId: 'chunk-higher-score',
            score: 0.9,
            sectionTitle: 'FAQ',
            text: 'Higher score text.',
          }),
        ],
      })),
    } as unknown as RetrievalService;
    const service = new ContextPackService(retrieval);

    const pack = await service.build({
      query: '  laser   hair removal  ',
      profile: 'article_generation',
      topicId: 'topic-1',
      language: 'en',
      geo: { countryCode: 'PL' },
    });

    expect(retrieval.search).toHaveBeenCalledWith(expect.objectContaining({
      query: 'laser hair removal',
      topicId: 'topic-1',
      language: 'en',
      geo: { countryCode: 'PL' },
      rankingProfile: 'balanced',
      limit: 12,
    }));
    expect(pack.normalizedQuery).toBe('laser hair removal');
    expect(pack.sources).toHaveLength(1);
    expect(pack.sections).toHaveLength(1);
    expect(pack.sections[0].chunkIds).toEqual([
      'chunk-higher-score',
      'chunk-lower-score',
    ]);
  });

  it('uses profile settings for raw retrieval output and debug metadata', async () => {
    const response = retrievalResponseFixture();
    const retrieval = {
      search: jest.fn().mockResolvedValue(response),
    } as unknown as RetrievalService;
    const service = new ContextPackService(retrieval);

    const pack = await service.build({
      query: 'laser',
      profile: 'raw_retrieval',
      includeRawRetrieval: true,
      includeDebug: true,
    });

    expect(retrieval.search).toHaveBeenCalledWith(expect.objectContaining({
      rankingProfile: 'balanced',
      includeDebug: true,
      limit: 20,
    }));
    expect(pack.rawRetrieval).toEqual(response.results);
    expect(pack.debug?.profile.name).toBe('raw_retrieval');
    expect(pack.outlineHints).toEqual([]);
  });

  it('exposes degraded retrieval as content gaps', async () => {
    const retrieval = {
      search: jest.fn().mockResolvedValue(retrievalResponseFixture({
        degraded: true,
        warnings: ['Vector results unavailable'],
      })),
    } as unknown as RetrievalService;
    const service = new ContextPackService(retrieval);

    const pack = await service.build({
      query: 'laser',
      profile: 'research',
    });

    expect(pack.retrieval).toMatchObject({
      degraded: true,
      warnings: ['Vector results unavailable'],
      resultCount: 1,
    });
    expect(pack.contentGaps).toContainEqual({
      code: 'degraded_retrieval',
      detail: 'Vector results unavailable',
    });
  });
});
