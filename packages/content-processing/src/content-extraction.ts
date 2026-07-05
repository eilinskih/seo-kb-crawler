import {
  DocumentMetadata,
  GeoHint,
  HeadingObservation,
  LanguageHint,
  StructuredDataObservation,
} from './domain/content-processing-types';

export interface ContentExtractionInput {
  rawHtml: string | null;
  cleanedMarkdown: string | null;
  plainText: string | null;
  requestedUrl: string;
  finalUrl: string | null;
  canonicalUrl: string | null;
  headers: Record<string, string>;
}

export interface ContentExtractionResult {
  metadata: DocumentMetadata;
  structuredData: StructuredDataObservation[];
  languageHints: LanguageHint[];
  geoHints: GeoHint[];
}

export function extractContentSignals(
  input: ContentExtractionInput,
): ContentExtractionResult {
  const html = input.rawHtml ?? '';
  const text = input.plainText ?? input.cleanedMarkdown ?? '';
  const hreflangLinks = extractHreflangLinks(html);
  const languageHints = extractLanguageHints(html, input.headers);

  return {
    metadata: {
      headings: extractHeadings(input.cleanedMarkdown, html),
      openGraph: extractMetaMap(html, 'property', 'og:'),
      twitterCard: extractMetaMap(html, 'name', 'twitter:'),
      wordCount: wordCount(text),
      characterCount: text.length,
      contentType: headerValue(input.headers, 'content-type'),
      cacheHeaders: selectedCacheHeaders(input.headers),
      robotsMeta: metaContent(html, 'name', 'robots'),
      canonicalUrl: input.canonicalUrl ?? canonicalLink(html),
      hreflangLinks,
      publishedTime:
        metaContent(html, 'property', 'article:published_time') ??
        metaContent(html, 'name', 'date'),
      updatedTime:
        metaContent(html, 'property', 'article:modified_time') ??
        metaContent(html, 'name', 'last-modified'),
    },
    structuredData: extractStructuredData(html),
    languageHints,
    geoHints: extractGeoHints(input, hreflangLinks),
  };
}

function extractHeadings(
  markdown: string | null,
  html: string,
): HeadingObservation[] {
  const markdownHeadings = markdown
    ? markdown
      .split(/\r?\n/)
      .map((line, index) => {
        const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
        if (!match) {
          return null;
        }
        return {
          level: match[1].length as HeadingObservation['level'],
          text: cleanText(match[2]),
          position: index,
        };
      })
      .filter((heading): heading is HeadingObservation => Boolean(heading))
    : [];

  if (markdownHeadings.length > 0) {
    return markdownHeadings;
  }

  return [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map(
    (match, index) => ({
      level: Number(match[1]) as HeadingObservation['level'],
      text: cleanText(stripTags(match[2])),
      position: index,
    }),
  );
}

function extractMetaMap(
  html: string,
  attributeName: 'name' | 'property',
  prefix: string,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const tag of metaTags(html)) {
    const key = attribute(tag, attributeName);
    const content = attribute(tag, 'content');
    if (key?.toLowerCase().startsWith(prefix) && content) {
      values[key] = content;
    }
  }
  return values;
}

function extractStructuredData(html: string): StructuredDataObservation[] {
  return [...extractJsonLd(html), ...extractMicrodata(html)];
}

function extractJsonLd(html: string): StructuredDataObservation[] {
  const observations: StructuredDataObservation[] = [];
  for (const [index, match] of [
    ...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ].entries()) {
    try {
      observations.push({
        format: 'json_ld',
        data: JSON.parse(decodeHtml(match[1].trim())),
        position: index,
      });
    } catch {
      continue;
    }
  }
  return observations;
}

function extractMicrodata(html: string): StructuredDataObservation[] {
  return [...html.matchAll(/<([a-z0-9-]+)\b[^>]*itemscope[^>]*>([\s\S]*?)<\/\1>/gi)].map(
    (match, index) => ({
      format: 'microdata',
      data: {
        itemType: attribute(match[0], 'itemtype'),
        properties: extractMicrodataProperties(match[2]),
      },
      position: index,
    }),
  );
}

function extractMicrodataProperties(html: string): Record<string, string> {
  const properties: Record<string, string> = {};
  for (const tagMatch of html.matchAll(/<([a-z0-9-]+)\b[^>]*itemprop=["']([^"']+)["'][^>]*>([\s\S]*?)<\/\1>/gi)) {
    properties[tagMatch[2]] = cleanText(stripTags(tagMatch[3]));
  }
  for (const tag of [
    ...html.matchAll(/<[a-z0-9-]+\b[^>]*itemprop=["'][^"']+["'][^>]*>/gi),
  ].map((match) => match[0])) {
    const property = attribute(tag, 'itemprop');
    const content = attribute(tag, 'content');
    if (property && content) {
      properties[property] = content;
    }
  }
  return properties;
}

function extractLanguageHints(
  html: string,
  headers: Record<string, string>,
): LanguageHint[] {
  const hints: LanguageHint[] = [];
  const htmlLang = /<html\b[^>]*\blang=["']([^"']+)["'][^>]*>/i.exec(html)?.[1];
  if (htmlLang) {
    hints.push({ tag: htmlLang, confidence: 0.9, source: 'html_lang' });
  }
  const contentLanguage = headerValue(headers, 'content-language');
  if (contentLanguage) {
    hints.push({
      tag: contentLanguage.split(',')[0].trim(),
      confidence: 0.7,
      source: 'meta',
    });
  }
  return hints;
}

function extractGeoHints(
  input: ContentExtractionInput,
  hreflangLinks: Record<string, string>,
): GeoHint[] {
  const hints: GeoHint[] = [];
  const url = input.finalUrl ?? input.requestedUrl;
  const tldMatch = /^https?:\/\/[^/]+\.([a-z]{2})(?:[/:]|$)/i.exec(url);
  if (tldMatch) {
    hints.push({
      countryCode: tldMatch[1].toUpperCase(),
      confidence: 0.7,
      source: 'url',
    });
  }
  for (const tag of Object.keys(hreflangLinks)) {
    const parts = tag.split('-');
    if (parts.length >= 2 && parts[1].length === 2) {
      hints.push({
        countryCode: parts[1].toUpperCase(),
        confidence: 0.6,
        source: 'metadata',
      });
    }
  }
  return hints;
}

function extractHreflangLinks(html: string): Record<string, string> {
  const links: Record<string, string> = {};
  for (const tag of linkTags(html)) {
    const rel = attribute(tag, 'rel');
    const hreflang = attribute(tag, 'hreflang');
    const href = attribute(tag, 'href');
    if (rel?.toLowerCase().includes('alternate') && hreflang && href) {
      links[hreflang] = href;
    }
  }
  return links;
}

function canonicalLink(html: string): string | null {
  for (const tag of linkTags(html)) {
    const rel = attribute(tag, 'rel');
    const href = attribute(tag, 'href');
    if (rel?.toLowerCase() === 'canonical' && href) {
      return href;
    }
  }
  return null;
}

function metaContent(
  html: string,
  attributeName: 'name' | 'property',
  expectedValue: string,
): string | null {
  const expected = expectedValue.toLowerCase();
  for (const tag of metaTags(html)) {
    const key = attribute(tag, attributeName);
    const content = attribute(tag, 'content');
    if (key?.toLowerCase() === expected && content) {
      return content;
    }
  }
  return null;
}

function metaTags(html: string): string[] {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0]);
}

function linkTags(html: string): string[] {
  return [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
}

function attribute(tag: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escaped}\\s*=\\s*["']([^"']+)["']`, 'i').exec(tag);
  return match ? decodeHtml(match[1]) : null;
}

function selectedCacheHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const selected: Record<string, string> = {};
  for (const key of ['cache-control', 'expires', 'etag', 'last-modified']) {
    const value = headerValue(headers, key);
    if (value) {
      selected[key] = value;
    }
  }
  return selected;
}

function headerValue(
  headers: Record<string, string>,
  key: string,
): string | null {
  const lowerKey = key.toLowerCase();
  const match = Object.entries(headers).find(
    ([headerKey]) => headerKey.toLowerCase() === lowerKey,
  );
  return match?.[1] ?? null;
}

function wordCount(text: string): number | null {
  if (!text.trim()) {
    return null;
  }
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ');
}

function cleanText(text: string): string {
  return decodeHtml(text).replace(/\s+/g, ' ').trim();
}

function decodeHtml(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
