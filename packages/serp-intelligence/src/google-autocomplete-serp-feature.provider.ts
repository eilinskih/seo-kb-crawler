import { Injectable } from '@nestjs/common';
import {
  SerpSearchProvider,
  SerpSearchProviderRequest,
  SerpSearchProviderResult,
} from './serp-search.provider';

const defaultGoogleSuggestTimeoutMs = 6_000;

@Injectable()
export class GoogleAutocompleteSerpFeatureProvider implements SerpSearchProvider {
  readonly providerKey = 'google_autocomplete';
  readonly providerMode = 'fallback' as const;

  async search(
    request: SerpSearchProviderRequest,
  ): Promise<SerpSearchProviderResult> {
    if (process.env.GOOGLE_AUTOCOMPLETE_ENABLED === 'false') {
      return degradedResult('Google autocomplete provider is disabled.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), googleSuggestTimeoutMs());
    try {
      const response = await fetch(googleSuggestUrl(request), {
        headers: {
          accept: 'application/json,text/javascript,*/*;q=0.1',
          'accept-language': acceptLanguage(request.language),
        },
        signal: controller.signal,
      });
      const body = await response.text();
      if (!response.ok) {
        return degradedResult(`Google autocomplete returned HTTP ${response.status}.`);
      }

      const suggestions = parseGoogleSuggestResponse(body);
      return {
        providerKey: this.providerKey,
        providerMode: this.providerMode,
        degraded: suggestions.length === 0,
        warnings: suggestions.length === 0
          ? ['Google autocomplete returned no suggestions.']
          : [],
        results: [],
        features: suggestions.length > 0
          ? { autocompleteSuggestions: suggestions }
          : undefined,
      };
    } catch (error) {
      return degradedResult(`Google autocomplete request failed: ${errorMessage(error)}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}

function googleSuggestUrl(request: SerpSearchProviderRequest): string {
  const url = new URL('https://suggestqueries.google.com/complete/search');
  url.searchParams.set('client', 'firefox');
  url.searchParams.set('ie', 'utf-8');
  url.searchParams.set('oe', 'utf-8');
  url.searchParams.set('q', request.query);
  if (request.language) {
    url.searchParams.set('hl', request.language.toLowerCase());
  }
  if (request.geo?.countryCode) {
    url.searchParams.set('gl', request.geo.countryCode.toUpperCase());
  }
  return url.toString();
}

function parseGoogleSuggestResponse(body: string): string[] {
  try {
    const parsed = JSON.parse(body) as unknown;
    if (!Array.isArray(parsed) || !Array.isArray(parsed[1])) {
      return [];
    }
    return uniqueTexts(parsed[1]
      .filter((value): value is string => typeof value === 'string'));
  } catch {
    return [];
  }
}

function uniqueTexts(values: string[]): string[] {
  return [...new Set(values
    .map((value) => value.trim().replace(/\s+/gu, ' '))
    .filter(Boolean))]
    .slice(0, 50);
}

function acceptLanguage(language: string | undefined): string {
  return language ? `${language},en;q=0.8` : 'en;q=0.8';
}

function googleSuggestTimeoutMs(): number {
  const value = Number(
    process.env.GOOGLE_AUTOCOMPLETE_TIMEOUT_MS ?? defaultGoogleSuggestTimeoutMs,
  );
  return Number.isFinite(value) && value > 0
    ? value
    : defaultGoogleSuggestTimeoutMs;
}

function degradedResult(warning: string): SerpSearchProviderResult {
  return {
    providerKey: 'google_autocomplete',
    providerMode: 'fallback',
    degraded: true,
    warnings: [warning],
    results: [],
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
