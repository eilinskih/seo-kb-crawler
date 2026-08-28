import { Injectable } from '@nestjs/common';
import {
  SerpSearchProvider,
  SerpSearchProviderRequest,
  SerpSearchProviderResult,
} from './serp-search.provider';

const defaultGoogleSuggestTimeoutMs = 6_000;
const defaultGoogleAutocompleteMaxProbes = 12;

const languageIntentProbes: Record<string, string[]> = {
  de: [
    'casino',
    'demo',
    'bonus',
    'app',
    'erfahrungen',
    'seriös',
    'echtgeld',
    'kostenlos',
    'legal',
    'rtp',
  ],
  pl: [
    'cena',
    'opinie',
    'ranking',
    'sklep',
    'allegro',
    'castorama',
    'leroy merlin',
    'jak wybrać',
    'najlepszy',
    'z szufladami',
  ],
  en: [
    'casino',
    'demo',
    'bonus',
    'app',
    'review',
    'reviews',
    'real money',
    'free',
    'legal',
    'rtp',
  ],
};

const alphabetProbes = 'abcdefghijklmnopqrstuvwxyz'.split('');

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
      const warnings: string[] = [];
      const suggestions: string[] = [];
      const probes = autocompleteProbeQueries(request);

      for (const query of probes) {
        const response = await fetch(googleSuggestUrl({
          ...request,
          query,
        }), {
          headers: {
            accept: 'application/json,text/javascript,*/*;q=0.1',
            'accept-language': acceptLanguage(request.language),
          },
          signal: controller.signal,
        });
        const body = await response.text();
        if (!response.ok) {
          warnings.push(`Google autocomplete returned HTTP ${response.status} for probe "${query}".`);
          continue;
        }

        suggestions.push(...parseGoogleSuggestResponse(body));
      }

      const normalizedSuggestions = uniqueTexts(suggestions)
        .filter((suggestion) =>
          hasSeedOverlap(suggestion, request.query) &&
          isUsefulSuggestion(suggestion),
        )
        .slice(0, googleAutocompleteMaxSuggestions());
      return {
        providerKey: this.providerKey,
        providerMode: this.providerMode,
        degraded: normalizedSuggestions.length === 0 || warnings.length > 0,
        warnings: normalizedSuggestions.length === 0 && warnings.length === 0
          ? ['Google autocomplete returned no suggestions.']
          : warnings,
        results: [],
        features: normalizedSuggestions.length > 0
          ? { autocompleteSuggestions: normalizedSuggestions }
          : undefined,
      };
    } catch (error) {
      return degradedResult(`Google autocomplete request failed: ${errorMessage(error)}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function autocompleteProbeQueries(
  request: Pick<SerpSearchProviderRequest, 'query' | 'language'>,
): string[] {
  const seed = request.query.trim().replace(/\s+/gu, ' ');
  const language = request.language?.toLowerCase().split('-')[0] ?? 'en';
  const intentProbes = [
    ...(languageIntentProbes[language] ?? []),
    ...languageIntentProbes.en,
  ];
  const probes = [
    seed,
    ...intentProbes.map((probe) => `${seed} ${probe}`),
    ...alphabetProbes.map((probe) => `${seed} ${probe}`),
  ];

  return uniqueTexts(probes)
    .filter((query) => query.length <= 180)
    .slice(0, googleAutocompleteMaxProbes());
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

function hasSeedOverlap(suggestion: string, seed: string): boolean {
  const seedTokens = meaningfulTokens(seed);
  if (seedTokens.length === 0) {
    return false;
  }
  const suggestionTokens = meaningfulTokens(suggestion);
  const overlap = seedTokens.filter((token) =>
    suggestionTokens.includes(token),
  ).length;
  return overlap >= Math.min(2, seedTokens.length);
}

function meaningfulTokens(value: string): string[] {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .split(/[^a-z0-9ąćęłńóśźż]+/iu)
    .filter((token) => token.length >= 2);
}

function isUsefulSuggestion(value: string): boolean {
  const normalized = value.toLowerCase();
  const tokens = meaningfulTokens(value);
  if (tokens.length < 2 || tokens.length > 8) {
    return false;
  }
  if (/[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}]/u.test(value)) {
    return false;
  }
  if (/\b(www|http|https)\b/u.test(normalized)) {
    return false;
  }
  if (tokens.some((token) => token.length === 1 && !/^\d$/u.test(token))) {
    return false;
  }
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
    if ((counts.get(token) ?? 0) > 2) {
      return false;
    }
  }
  return true;
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

function googleAutocompleteMaxProbes(): number {
  return positiveInteger(
    process.env.GOOGLE_AUTOCOMPLETE_MAX_PROBES,
    defaultGoogleAutocompleteMaxProbes,
  );
}

function googleAutocompleteMaxSuggestions(): number {
  return positiveInteger(
    process.env.GOOGLE_AUTOCOMPLETE_MAX_SUGGESTIONS,
    100,
  );
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
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
