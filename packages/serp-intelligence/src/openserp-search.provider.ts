import { Injectable } from '@nestjs/common';
import {
  SerpSearchProvider,
  SerpSearchProviderRequest,
  SerpSearchProviderResult,
} from './serp-search.provider';

const defaultOpenSerpTimeoutMs = 20_000;

@Injectable()
export class OpenSerpSearchProvider implements SerpSearchProvider {
  readonly providerKey = 'openserp_self_host';
  readonly providerMode = 'fallback' as const;

  isConfigured(): boolean {
    return openSerpBaseUrl() !== null;
  }

  async search(
    request: SerpSearchProviderRequest,
  ): Promise<SerpSearchProviderResult> {
    const baseUrl = openSerpBaseUrl();
    if (!baseUrl) {
      return this.degradedResult('OpenSERP is not configured. Set OPENSERP_BASE_URL to enable it.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), openSerpTimeoutMs());
    try {
      const response = await fetch(openSerpSearchUrl(baseUrl, request), {
        headers: { accept: 'application/json' },
        signal: controller.signal,
      });
      const body = await readJsonBody(response);
      if (!response.ok) {
        return this.degradedResult(openSerpHttpWarning(response.status, body));
      }

      const envelope = normalizeOpenSerpEnvelope(body);
      const results = envelope.results
        .filter(isOrganicResultWithUrl)
        .slice(0, Math.max(1, Math.min(request.limit, 10)))
        .map((result, index) => ({
          url: result.url,
          title: result.title ?? null,
          snippet: result.snippet ?? null,
          position: result.position?.absolute ?? result.rank ?? index + 1,
        }));

      const warnings = openSerpWarnings(envelope);
      if (results.length === 0) {
        warnings.push('OpenSERP returned no organic result URLs.');
      }

      return {
        providerKey: this.providerKey,
        providerMode: this.providerMode,
        degraded: warnings.length > 0,
        warnings,
        results,
        features: nonEmptyFeatures(envelope.features),
      };
    } catch (error) {
      return this.degradedResult(`OpenSERP request failed: ${errorMessage(error)}`);
    } finally {
      clearTimeout(timeout);
    }
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

interface OpenSerpEnvelope {
  meta: {
    engines_responded?: string[];
    engines_failed?: string[];
    engine_errors?: Array<{
      engine?: string;
      error?: string;
      message?: string;
    }>;
  };
  results: Array<{
    type?: string;
    rank?: number;
    title?: string | null;
    url?: string;
    snippet?: string | null;
    position?: {
      absolute?: number;
    };
  }>;
  features: {
    peopleAlsoAsk: string[];
    relatedSearches: string[];
    autocompleteSuggestions: string[];
  };
}

function openSerpSearchUrl(
  baseUrl: string,
  request: SerpSearchProviderRequest,
): string {
  const url = new URL('/mega/search', baseUrl);
  url.searchParams.set('text', request.query);
  url.searchParams.set('limit', String(Math.max(1, Math.min(request.limit, 10))));
  url.searchParams.set('engines', openSerpEngines());
  url.searchParams.set('mode', 'any');
  url.searchParams.set('format', 'json');
  url.searchParams.set('features', 'true');
  if (request.language) {
    url.searchParams.set('lang', request.language.toUpperCase());
  }
  if (request.geo?.countryCode) {
    url.searchParams.set('region', request.geo.countryCode.toUpperCase());
  }
  return url.toString();
}

function openSerpBaseUrl(): string | null {
  const value = process.env.OPENSERP_BASE_URL?.trim();
  if (!value) {
    return null;
  }
  return value.endsWith('/') ? value : `${value}/`;
}

function openSerpEngines(): string {
  return process.env.OPENSERP_ENGINES?.trim() || 'google,bing';
}

function openSerpTimeoutMs(): number {
  const value = Number(process.env.OPENSERP_TIMEOUT_MS ?? defaultOpenSerpTimeoutMs);
  return Number.isFinite(value) && value > 0 ? value : defaultOpenSerpTimeoutMs;
}

async function readJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) {
    return {};
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function normalizeOpenSerpEnvelope(value: unknown): OpenSerpEnvelope {
  const object = isRecord(value) ? value : {};
  const meta = isRecord(object.meta) ? object.meta : {};
  const results = Array.isArray(object.results) ? object.results : [];
  return {
    meta: {
      engines_responded: stringArray(meta.engines_responded),
      engines_failed: stringArray(meta.engines_failed),
      engine_errors: Array.isArray(meta.engine_errors)
        ? meta.engine_errors.filter(isRecord).map((error) => ({
          engine: stringValue(error.engine),
          error: stringValue(error.error),
          message: stringValue(error.message),
        }))
        : [],
    },
    results: results.filter(isRecord).map((result) => ({
      type: stringValue(result.type),
      rank: numberValue(result.rank),
      title: nullableStringValue(result.title),
      url: stringValue(result.url),
      snippet: nullableStringValue(result.snippet),
      position: isRecord(result.position)
        ? { absolute: numberValue(result.position.absolute) }
        : undefined,
    })),
    features: extractOpenSerpFeatures(object),
  };
}

function extractOpenSerpFeatures(
  envelope: Record<string, unknown>,
): OpenSerpEnvelope['features'] {
  const results = Array.isArray(envelope.results)
    ? envelope.results.filter(isRecord)
    : [];
  return {
    peopleAlsoAsk: uniqueTexts([
      ...textList(envelope.people_also_ask),
      ...textList(envelope.peopleAlsoAsk),
      ...textList(envelope.questions),
      ...resultTexts(results, ['people_also_ask', 'peopleAlsoAsk', 'question']),
    ]),
    relatedSearches: uniqueTexts([
      ...textList(envelope.related_searches),
      ...textList(envelope.relatedSearches),
      ...resultTexts(results, ['related_search', 'relatedSearch']),
    ]),
    autocompleteSuggestions: uniqueTexts([
      ...textList(envelope.autocomplete),
      ...textList(envelope.autocomplete_suggestions),
      ...textList(envelope.suggestions),
      ...resultTexts(results, ['autocomplete', 'suggestion']),
    ]),
  };
}

function resultTexts(
  results: Record<string, unknown>[],
  types: string[],
): string[] {
  const accepted = new Set(types.map((type) => type.toLowerCase()));
  return results
    .filter((result) => {
      const type = stringValue(result.type)?.toLowerCase();
      return type ? accepted.has(type) : false;
    })
    .flatMap(textValues);
}

function textList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (typeof item === 'string') {
      return [item];
    }
    if (isRecord(item)) {
      return textValues(item);
    }
    return [];
  });
}

function textValues(value: Record<string, unknown>): string[] {
  return ['text', 'query', 'question', 'title', 'name']
    .map((key) => stringValue(value[key]))
    .filter((text): text is string => Boolean(text));
}

function uniqueTexts(values: string[]): string[] {
  return [...new Set(values
    .map((value) => value.trim().replace(/\s+/gu, ' '))
    .filter(Boolean))]
    .slice(0, 50);
}

function nonEmptyFeatures(
  features: OpenSerpEnvelope['features'],
): OpenSerpEnvelope['features'] | undefined {
  return features.peopleAlsoAsk.length > 0 ||
    features.relatedSearches.length > 0 ||
    features.autocompleteSuggestions.length > 0
    ? features
    : undefined;
}

function openSerpWarnings(envelope: OpenSerpEnvelope): string[] {
  const warnings: string[] = [];
  if (envelope.meta.engines_failed && envelope.meta.engines_failed.length > 0) {
    warnings.push(`OpenSERP engines failed: ${envelope.meta.engines_failed.join(', ')}`);
  }
  for (const error of envelope.meta.engine_errors ?? []) {
    const engine = error.engine ?? 'unknown';
    const reason = error.error ?? 'unknown_error';
    const message = error.message ? `: ${error.message}` : '';
    warnings.push(`OpenSERP ${engine} ${reason}${message}`);
  }
  return warnings;
}

function isOrganicResultWithUrl(
  result: OpenSerpEnvelope['results'][number],
): result is OpenSerpEnvelope['results'][number] & { url: string } {
  return result.type === 'organic' && typeof result.url === 'string' &&
    result.url.trim() !== '';
}

function openSerpHttpWarning(status: number, body: unknown): string {
  const object = isRecord(body) ? body : {};
  const error = stringValue(object.error) ?? 'provider_error';
  const message = stringValue(object.message);
  const mapped = status === 429 || error === 'blocked'
    ? 'blocked_or_rate_limited'
    : error;
  return message
    ? `OpenSERP returned HTTP ${status} ${mapped}: ${message}`
    : `OpenSERP returned HTTP ${status} ${mapped}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function nullableStringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
