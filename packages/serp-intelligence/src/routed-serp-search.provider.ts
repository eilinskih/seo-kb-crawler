import { Injectable } from '@nestjs/common';
import { DuckDuckGoHtmlSerpSearchProvider } from './duckduckgo-html-serp-search.provider';
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
  ) {}

  async search(
    request: SerpSearchProviderRequest,
  ): Promise<SerpSearchProviderResult> {
    const warnings: string[] = [];

    if (this.openSerpProvider.isConfigured()) {
      const openSerpResult = await this.openSerpProvider.search(request);
      if (openSerpResult.results.length > 0) {
        return openSerpResult;
      }
      warnings.push(...openSerpResult.warnings);
    }

    const fallbackResult = await this.htmlFallbackProvider.search(request);
    return {
      ...fallbackResult,
      degraded: fallbackResult.degraded || warnings.length > 0,
      warnings: [...warnings, ...fallbackResult.warnings],
    };
  }
}
