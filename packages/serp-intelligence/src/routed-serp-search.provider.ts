import { Injectable, Optional } from '@nestjs/common';
import { DuckDuckGoHtmlSerpSearchProvider } from './duckduckgo-html-serp-search.provider';
import { GoogleAutocompleteSerpFeatureProvider } from './google-autocomplete-serp-feature.provider';
import { OpenSerpSearchProvider } from './openserp-search.provider';
import {
  SerpSearchProvider,
  SerpSearchProviderRequest,
  SerpSearchProviderResult,
} from './serp-search.provider';

@Injectable()
export class RoutedSerpSearchProvider implements SerpSearchProvider {
  readonly providerKey = 'routed_serp_provider';
  readonly providerMode = 'fallback' as const;

  constructor(
    private readonly openSerpProvider: OpenSerpSearchProvider,
    private readonly htmlFallbackProvider: DuckDuckGoHtmlSerpSearchProvider,
    @Optional()
    private readonly googleAutocompleteProvider?: GoogleAutocompleteSerpFeatureProvider,
  ) {}

  async search(
    request: SerpSearchProviderRequest,
  ): Promise<SerpSearchProviderResult> {
    const warnings: string[] = [];
    const autocomplete = await this.googleAutocompleteProvider?.search(request);

    if (this.openSerpProvider.isConfigured()) {
      const openSerpResult = await this.openSerpProvider.search(request);
      if (openSerpResult.results.length > 0) {
        return mergeFeatureResult(openSerpResult, autocomplete);
      }
      warnings.push(...openSerpResult.warnings);
    }

    const fallbackResult = await this.htmlFallbackProvider.search(request);
    const mergedFallback = mergeFeatureResult(fallbackResult, autocomplete);
    const fallbackWarnings = [...warnings, ...mergedFallback.warnings];
    if (mergedFallback.results.length > 0 || hasFeatures(mergedFallback)) {
      return {
        ...mergedFallback,
        degraded: mergedFallback.degraded || warnings.length > 0,
        warnings: fallbackWarnings,
      };
    }

    return {
      ...mergedFallback,
      degraded: true,
      warnings: fallbackWarnings,
    };
  }
}

function mergeFeatureResult(
  base: SerpSearchProviderResult,
  featureResult: SerpSearchProviderResult | undefined,
): SerpSearchProviderResult {
  if (!featureResult) {
    return base;
  }

  return {
    ...base,
    degraded: base.degraded || featureResult.degraded,
    warnings: [...base.warnings, ...featureResult.warnings],
    features: {
      peopleAlsoAsk: unique([
        ...(base.features?.peopleAlsoAsk ?? []),
        ...(featureResult.features?.peopleAlsoAsk ?? []),
      ]),
      relatedSearches: unique([
        ...(base.features?.relatedSearches ?? []),
        ...(featureResult.features?.relatedSearches ?? []),
      ]),
      autocompleteSuggestions: unique([
        ...(base.features?.autocompleteSuggestions ?? []),
        ...(featureResult.features?.autocompleteSuggestions ?? []),
      ]),
    },
  };
}

function hasFeatures(result: SerpSearchProviderResult): boolean {
  return Boolean(
    result.features?.peopleAlsoAsk?.length ||
    result.features?.relatedSearches?.length ||
    result.features?.autocompleteSuggestions?.length,
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
