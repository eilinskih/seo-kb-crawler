import { Injectable } from '@nestjs/common';
import {
  SerpSearchProvider,
  SerpSearchProviderRequest,
  SerpSearchProviderResult,
} from './serp-search.provider';

@Injectable()
export class DuckDuckGoHtmlSerpSearchProvider implements SerpSearchProvider {
  readonly providerKey = 'free_html_serp_fallback';
  readonly providerMode = 'fallback' as const;

  async search(
    request: SerpSearchProviderRequest,
  ): Promise<SerpSearchProviderResult> {
    const warnings: string[] = [];
    const query = request.query.trim();
    if (!query) {
      return this.degradedResult('SERP query is empty');
    }

    for (const source of searchSources(request)) {
      try {
        const response = await fetch(source.url, {
          headers: {
            accept: 'text/html',
            'user-agent': [
              'Mozilla/5.0',
              '(compatible; SEO-KB-Crawler/0.1; operator-console)',
            ].join(' '),
          },
        });
        if (!response.ok) {
          warnings.push(`${source.label} returned HTTP ${response.status}`);
          continue;
        }

        const html = await response.text();
        if (source.challengePattern.test(html)) {
          warnings.push(`${source.label} returned an anti-bot challenge`);
          continue;
        }

        const results = source.parse(html)
          .filter((result) => isRelevantResult(result, request.query))
          .slice(0, Math.max(1, Math.min(request.limit, 10)))
          .map((result, index) => ({
            ...result,
            position: index + 1,
          }));

        if (results.length === 0) {
          warnings.push(`${source.label} returned no relevant organic result URLs`);
          continue;
        }

        return {
          providerKey: this.providerKey,
          providerMode: this.providerMode,
          degraded: warnings.length > 0,
          warnings,
          results,
        };
      } catch (error) {
        warnings.push(`${source.label} failed: ${errorMessage(error)}`);
      }
    }

    return this.degradedResult(
      warnings.length > 0
        ? warnings.join(' ')
        : 'Fallback SERP provider returned no organic result URLs',
    );
  }

  private degradedResult(warning: string): SerpSearchProviderResult {
    return {
      providerKey: this.providerKey,
      providerMode: this.providerMode,
      degraded: true,
      warnings: [warning],
      results: [],
    };
  }
}

export function parseBingHtmlResults(html: string): Array<{
  url: string;
  title: string | null;
  snippet: string | null;
  position: number;
}> {
  const results: Array<{
    url: string;
    title: string | null;
    snippet: string | null;
    position: number;
  }> = [];
  const seen = new Set<string>();
  const items = html.matchAll(
    /<li\b(?=[^>]*\bclass=["'][^"']*\bb_algo\b[^"']*["'])[\s\S]*?<h2[^>]*>\s*<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/giu,
  );

  for (const match of items) {
    const url = normalizeResultUrl(decodeHtml(match[1]));
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);
    results.push({
      url,
      title: stripHtml(match[2]),
      snippet: null,
      position: results.length + 1,
    });
  }

  return results;
}

export function parseGoogleHtmlResults(html: string): Array<{
  url: string;
  displayUrl?: string | null;
  clickUrl?: string | null;
  resolvedUrl?: string | null;
  urlResolutionStatus?: 'direct' | 'redirect_parameter' | 'unresolved_redirect' | 'provider_resolved';
  title: string | null;
  snippet: string | null;
  position: number;
}> {
  const results: Array<{
    url: string;
    displayUrl?: string | null;
    clickUrl?: string | null;
    resolvedUrl?: string | null;
    urlResolutionStatus?: 'direct' | 'redirect_parameter' | 'unresolved_redirect' | 'provider_resolved';
    title: string | null;
    snippet: string | null;
    position: number;
  }> = [];
  const seen = new Set<string>();
  const anchors = html.matchAll(
    /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/giu,
  );

  for (const match of anchors) {
    const resolved = normalizeGoogleResultUrl(decodeHtml(match[1]));
    const resultUrl = resolved.url;
    const title = stripHtml(match[2]);
    if (
      !resultUrl ||
      !title ||
      seen.has(resultUrl) ||
      isGoogleInternalUrl(resultUrl)
    ) {
      continue;
    }
    seen.add(resultUrl);
    results.push({
      ...resolved,
      url: resultUrl,
      title,
      snippet: null,
      position: results.length + 1,
    });
  }

  return results;
}

export function parseDuckDuckGoHtmlResults(html: string): Array<{
  url: string;
  title: string | null;
  snippet: string | null;
  position: number;
}> {
  const results: Array<{
    url: string;
    title: string | null;
    snippet: string | null;
    position: number;
  }> = [];
  const seen = new Set<string>();
  const anchors = html.matchAll(
    /<a\b(?=[^>]*\bclass=["'][^"']*\bresult__a\b[^"']*["'])[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/giu,
  );

  for (const match of anchors) {
    const url = normalizeResultUrl(decodeHtml(match[1]));
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);
    results.push({
      url,
      title: stripHtml(match[2]),
      snippet: null,
      position: results.length + 1,
    });
  }

  return results;
}

function searchSources(request: SerpSearchProviderRequest): Array<{
  label: string;
  url: string;
  challengePattern: RegExp;
  parse: (html: string) => ReturnType<typeof parseDuckDuckGoHtmlResults>;
}> {
  return [
    {
      label: 'Google HTML fallback',
      url: googleSearchUrl(request),
      challengePattern: /\/sorry\/index|Our systems have detected unusual traffic|nietypowy ruch|recaptcha|g-recaptcha|\/httpservice\/retry\/enablejs|emsg=SG_REL/iu,
      parse: parseGoogleHtmlResults,
    },
    {
      label: 'Bing HTML fallback',
      url: bingSearchUrl(request),
      challengePattern: /captcha|verify\s+you\s+are\s+a\s+human/iu,
      parse: parseBingHtmlResults,
    },
    {
      label: 'DuckDuckGo HTML fallback',
      url: duckDuckGoSearchUrl(request),
      challengePattern: /anomaly-modal|Unfortunately,\s*bots\s*use\s*DuckDuckGo\s*too/iu,
      parse: parseDuckDuckGoHtmlResults,
    },
  ];
}

function googleSearchUrl(request: SerpSearchProviderRequest): string {
  const url = new URL('https://www.google.com/search');
  url.searchParams.set('q', request.query);
  url.searchParams.set('num', String(Math.max(1, Math.min(request.limit, 10))));
  url.searchParams.set('pws', '0');
  if (request.language) {
    url.searchParams.set('hl', request.language);
  }
  if (request.geo?.countryCode) {
    url.searchParams.set('gl', request.geo.countryCode.toLowerCase());
  }
  return url.toString();
}

function duckDuckGoSearchUrl(request: SerpSearchProviderRequest): string {
  const url = new URL('https://html.duckduckgo.com/html/');
  url.searchParams.set('q', request.query);
  const locale = duckDuckGoLocale(request.language, request.geo?.countryCode);
  if (locale) {
    url.searchParams.set('kl', locale);
  }
  return url.toString();
}

function bingSearchUrl(request: SerpSearchProviderRequest): string {
  const url = new URL('https://www.bing.com/search');
  url.searchParams.set('q', request.query);
  if (request.geo?.countryCode) {
    url.searchParams.set('cc', request.geo.countryCode);
  }
  if (request.language) {
    url.searchParams.set('setlang', request.language);
  }
  return url.toString();
}

function duckDuckGoLocale(
  language: string | undefined,
  countryCode: string | undefined,
): string | null {
  if (!language || !countryCode) {
    return null;
  }
  return `${language.toLowerCase()}-${countryCode.toLowerCase()}`;
}

function normalizeResultUrl(value: string): string | null {
  try {
    const url = value.startsWith('//')
      ? new URL(`https:${value}`)
      : new URL(value, 'https://html.duckduckgo.com');
    const redirectTarget = url.searchParams.get('uddg') ??
      decodeBingRedirectTarget(url.searchParams.get('u'));
    const target = redirectTarget ? new URL(redirectTarget) : url;
    if (!['http:', 'https:'].includes(target.protocol)) {
      return null;
    }
    target.hash = '';
    return target.toString();
  } catch {
    return null;
  }
}

function normalizeGoogleResultUrl(value: string): {
  url: string | null;
  displayUrl: string | null;
  clickUrl: string | null;
  resolvedUrl: string | null;
  urlResolutionStatus: 'direct' | 'redirect_parameter' | 'unresolved_redirect';
} {
  try {
    const url = value.startsWith('/')
      ? new URL(value, 'https://www.google.com')
      : new URL(value);
    const redirectTarget = googleRedirectTarget(url);
    if (!redirectTarget && isGoogleRedirectPath(url.pathname)) {
      return {
        url: null,
        displayUrl: null,
        clickUrl: url.toString(),
        resolvedUrl: null,
        urlResolutionStatus: 'unresolved_redirect',
      };
    }

    const target = redirectTarget ? new URL(redirectTarget) : url;
    if (!['http:', 'https:'].includes(target.protocol)) {
      return {
        url: null,
        displayUrl: null,
        clickUrl: url.toString(),
        resolvedUrl: null,
        urlResolutionStatus: redirectTarget ? 'redirect_parameter' : 'direct',
      };
    }
    target.hash = '';
    return {
      url: target.toString(),
      displayUrl: target.hostname.replace(/^www\./u, ''),
      clickUrl: url.toString(),
      resolvedUrl: target.toString(),
      urlResolutionStatus: redirectTarget ? 'redirect_parameter' : 'direct',
    };
  } catch {
    return {
      url: null,
      displayUrl: null,
      clickUrl: null,
      resolvedUrl: null,
      urlResolutionStatus: 'unresolved_redirect',
    };
  }
}

function googleRedirectTarget(url: URL): string | null {
  return url.searchParams.get('q') ??
    url.searchParams.get('url') ??
    url.searchParams.get('target') ??
    url.searchParams.get('adurl');
}

function isGoogleRedirectPath(pathname: string): boolean {
  return pathname === '/url' ||
    pathname === '/goto' ||
    pathname.endsWith('/goto');
}

function decodeBingRedirectTarget(value: string | null): string | null {
  if (!value?.startsWith('a1')) {
    return null;
  }
  try {
    const encoded = value.slice(2).replace(/-/gu, '+').replace(/_/gu, '/');
    return Buffer.from(encoded, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function isGoogleInternalUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.replace(/^www\./u, '');
    return host === 'google.com' ||
      host.endsWith('.google.com') ||
      host === 'gstatic.com' ||
      host.endsWith('.gstatic.com');
  } catch {
    return true;
  }
}

function isRelevantResult(
  result: { url: string; title: string | null },
  query: string,
): boolean {
  const haystack = `${result.url} ${result.title ?? ''}`.toLowerCase();
  const terms = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .split(/\s+/u)
    .map((term) => term.trim())
    .filter((term) => term.length >= 4);
  if (terms.length === 0) {
    return true;
  }
  const normalizedHaystack = haystack
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
  return terms.every((term) => normalizedHaystack.includes(term));
}

function stripHtml(value: string): string | null {
  const stripped = decodeHtml(value.replace(/<[^>]*>/gu, ' '))
    .replace(/\s+/gu, ' ')
    .trim();
  return stripped.length > 0 ? stripped : null;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gu, '&')
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
