import {
  ContentProcessingRecord,
  DocumentVersionRecord,
} from './content-processing-types';

describe('Content Processing contracts', () => {
  it('represents document versions derived from crawl attempts', () => {
    const version: DocumentVersionRecord = {
      id: '00000000-0000-4000-8000-000000000003',
      documentId: '00000000-0000-4000-8000-000000000002',
      crawlAttemptId: 'attempt-1',
      topicId: '00000000-0000-4000-8000-000000000001',
      frontierEntryId: 'frontier-1',
      topicConfigurationVersion: 1,
      requestedUrl: 'https://example.com/page',
      finalUrl: 'https://example.com/page',
      canonicalUrl: 'https://example.com/page',
      title: 'Example',
      metaDescription: 'Description',
      contentHash: 'hash',
      extractorVersion: 'content-processor/0.1.0',
      rawHtml: '<html><title>Example</title></html>',
      cleanedMarkdown: '# Example',
      plainText: 'Example',
      metadata: {
        headings: [
          {
            level: 1,
            text: 'Example',
            position: 0,
          },
        ],
        openGraph: {},
        twitterCard: {},
        wordCount: 1,
        characterCount: 7,
        contentType: 'text/html',
        cacheHeaders: {},
        robotsMeta: null,
        canonicalUrl: 'https://example.com/page',
        hreflangLinks: {},
        publishedTime: null,
        updatedTime: null,
      },
      structuredData: [],
      languageHints: [
        {
          tag: 'en',
          confidence: 0.8,
          source: 'html_lang',
        },
      ],
      geoHints: [],
      createdAt: new Date('2026-07-04T00:00:00Z'),
    };

    expect(version.crawlAttemptId).toBe('attempt-1');
    expect(version.metadata.headings[0]?.level).toBe(1);
  });

  it('tracks processing state separately from crawl state', () => {
    const processingRecord: ContentProcessingRecord = {
      crawlAttemptId: 'attempt-1',
      documentId: null,
      documentVersionId: null,
      status: 'pending',
      failure: null,
      extractorVersion: 'content-processor/0.1.0',
      startedAt: null,
      completedAt: null,
      createdAt: new Date('2026-07-04T00:00:00Z'),
      updatedAt: new Date('2026-07-04T00:00:00Z'),
    };

    expect(processingRecord.status).toBe('pending');
    expect(processingRecord.failure).toBeNull();
  });
});
