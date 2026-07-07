import {
  RetrievalResponse,
  RetrievalResult,
} from '@seo-kb/retrieval';

export function retrievalResultFixture(
  overrides: Partial<RetrievalResult> = {},
): RetrievalResult {
  return {
    chunkId: 'chunk-1',
    documentId: 'document-1',
    documentVersionId: 'version-1',
    topicId: 'topic-1',
    score: 0.9,
    scoreBreakdown: {
      vector: 0.5,
      keyword: 0.4,
      metadata: 0,
      heading: 1,
      topic: 1,
      language: 1,
      geo: 1,
      chunkType: 0,
      diversity: 1,
    },
    matchedTerms: ['laser', 'hair'],
    language: 'en',
    geoHints: [{ countryCode: 'PL', confidence: 0.8, source: 'url' }],
    sourceUrl: 'https://example.com/laser',
    canonicalUrl: 'https://example.com/laser',
    sourceDomain: 'example.com',
    headingPath: ['Laser Hair Removal'],
    sectionTitle: 'Prices',
    chunkType: 'section',
    text: 'Laser hair removal prices depend on the treatment area.',
    ...overrides,
  };
}

export function retrievalResponseFixture(
  overrides: Partial<RetrievalResponse> = {},
): RetrievalResponse {
  return {
    results: [retrievalResultFixture()],
    warnings: [],
    degraded: false,
    ...overrides,
  };
}
