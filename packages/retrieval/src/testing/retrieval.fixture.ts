import {
  RetrievalCandidate,
  RetrievalQuery,
} from '../domain/retrieval-types';

export function retrievalQueryFixture(
  overrides: Partial<RetrievalQuery> = {},
): RetrievalQuery {
  return {
    query: 'laser hair removal warsaw',
    topicId: 'topic-1',
    language: 'en',
    geo: { countryCode: 'PL' },
    limit: 5,
    rankingProfile: 'balanced',
    includeDebug: true,
    ...overrides,
  };
}

export function retrievalCandidateFixture(
  overrides: Partial<RetrievalCandidate> = {},
): RetrievalCandidate {
  return {
    chunkId: 'chunk-1',
    documentId: 'document-1',
    documentVersionId: 'document-version-1',
    topicId: 'topic-1',
    text: 'Laser hair removal in Warsaw is available for face and bikini.',
    language: 'en',
    geoHints: [{ countryCode: 'PL', confidence: 0.8, source: 'url' }],
    sourceUrl: 'https://example.com/laser-hair-removal-warsaw',
    canonicalUrl: 'https://example.com/laser-hair-removal-warsaw',
    sourceDomain: 'example.com',
    headingPath: ['Laser Hair Removal', 'Warsaw'],
    sectionTitle: 'Warsaw',
    chunkType: 'local_section',
    contentHash: 'hash-1',
    normalizedTextHash: 'normalized-hash-1',
    vectorScore: 0,
    keywordScore: 0,
    metadataScore: 0,
    matchedTerms: [],
    modes: ['metadata'],
    ...overrides,
  };
}
