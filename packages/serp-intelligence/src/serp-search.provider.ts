import {
  SerpGeoTarget,
  SerpProviderMode,
  SerpQueryFeatures,
} from './domain/serp-intelligence-types';

export interface SerpSearchProviderRequest {
  query: string;
  language?: string;
  geo?: SerpGeoTarget;
  limit: number;
}

export interface SerpSearchProviderResult {
  providerKey: string;
  providerMode: SerpProviderMode;
  degraded: boolean;
  warnings: string[];
  results: Array<{
    url: string;
    displayUrl?: string | null;
    clickUrl?: string | null;
    resolvedUrl?: string | null;
    urlResolutionStatus?: 'direct' | 'redirect_parameter' | 'unresolved_redirect' | 'provider_resolved';
    title?: string | null;
    snippet?: string | null;
    position: number;
  }>;
  features?: Partial<SerpQueryFeatures>;
}

export interface SerpSearchProvider {
  providerKey: string;
  providerMode: SerpProviderMode;
  search(request: SerpSearchProviderRequest): Promise<SerpSearchProviderResult>;
}
