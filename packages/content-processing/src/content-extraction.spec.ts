import { extractContentSignals } from './content-extraction';

describe('extractContentSignals', () => {
  it('extracts documented initial metadata from HTML and Markdown', () => {
    const result = extractContentSignals({
      requestedUrl: 'https://example.pl/laser',
      finalUrl: 'https://example.pl/laser',
      canonicalUrl: null,
      cleanedMarkdown: '# Laser Hair Removal\n\n## Price',
      plainText: 'Laser Hair Removal Price',
      rawHtml: `
        <html lang="en">
          <head>
            <link rel="canonical" href="https://example.pl/laser" />
            <link rel="alternate" hreflang="pl-PL" href="https://example.pl/laser" />
            <meta name="robots" content="index,follow" />
            <meta property="og:title" content="Laser Hair Removal" />
            <meta name="twitter:card" content="summary" />
            <meta property="article:published_time" content="2026-01-01" />
            <script type="application/ld+json">
              {"@context":"https://schema.org","@type":"FAQPage"}
            </script>
          </head>
        </html>
      `,
      headers: {
        'content-type': 'text/html',
        'cache-control': 'max-age=3600',
      },
    });

    expect(result.metadata.headings).toEqual([
      { level: 1, text: 'Laser Hair Removal', position: 0 },
      { level: 2, text: 'Price', position: 2 },
    ]);
    expect(result.metadata.openGraph).toEqual({
      'og:title': 'Laser Hair Removal',
    });
    expect(result.metadata.twitterCard).toEqual({
      'twitter:card': 'summary',
    });
    expect(result.metadata.robotsMeta).toBe('index,follow');
    expect(result.metadata.canonicalUrl).toBe('https://example.pl/laser');
    expect(result.metadata.hreflangLinks).toEqual({
      'pl-PL': 'https://example.pl/laser',
    });
    expect(result.metadata.publishedTime).toBe('2026-01-01');
    expect(result.structuredData).toEqual([
      {
        format: 'json_ld',
        data: {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
        },
        position: 0,
      },
    ]);
    expect(result.languageHints).toEqual([
      { tag: 'en', confidence: 0.9, source: 'html_lang' },
    ]);
    expect(result.geoHints).toEqual([
      { countryCode: 'PL', confidence: 0.7, source: 'url' },
      { countryCode: 'PL', confidence: 0.6, source: 'metadata' },
    ]);
  });

  it('falls back to HTML headings when Markdown headings are unavailable', () => {
    const result = extractContentSignals({
      requestedUrl: 'https://example.com/page',
      finalUrl: null,
      canonicalUrl: null,
      cleanedMarkdown: null,
      plainText: 'Title Section',
      rawHtml: '<h1>Title</h1><h2>Section</h2>',
      headers: {},
    });

    expect(result.metadata.headings).toEqual([
      { level: 1, text: 'Title', position: 0 },
      { level: 2, text: 'Section', position: 1 },
    ]);
  });

  it('captures bounded microdata observations when present', () => {
    const result = extractContentSignals({
      requestedUrl: 'https://example.com/review',
      finalUrl: null,
      canonicalUrl: null,
      cleanedMarkdown: null,
      plainText: 'Review',
      rawHtml: `
        <article itemscope itemtype="https://schema.org/Review">
          <span itemprop="name">Laser review</span>
          <meta itemprop="ratingValue" content="5" />
        </article>
      `,
      headers: {},
    });

    expect(result.structuredData).toEqual([
      {
        format: 'microdata',
        data: {
          itemType: 'https://schema.org/Review',
          properties: {
            name: 'Laser review',
            ratingValue: '5',
          },
        },
        position: 0,
      },
    ]);
  });

  it('keeps microdata properties scoped to each item', () => {
    const result = extractContentSignals({
      requestedUrl: 'https://example.com/reviews',
      finalUrl: null,
      canonicalUrl: null,
      cleanedMarkdown: null,
      plainText: 'Reviews',
      rawHtml: `
        <article itemscope itemtype="https://schema.org/Review">
          <span itemprop="name">First review</span>
        </article>
        <article itemscope itemtype="https://schema.org/Product">
          <span itemprop="name">Second product</span>
        </article>
      `,
      headers: {},
    });

    expect(result.structuredData).toEqual([
      {
        format: 'microdata',
        data: {
          itemType: 'https://schema.org/Review',
          properties: {
            name: 'First review',
          },
        },
        position: 0,
      },
      {
        format: 'microdata',
        data: {
          itemType: 'https://schema.org/Product',
          properties: {
            name: 'Second product',
          },
        },
        position: 1,
      },
    ]);
  });
});
