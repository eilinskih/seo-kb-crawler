import {
  SerpGeoTarget,
  SerpProviderMode,
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
    title?: string | null;
    snippet?: string | null;
    position: number;
  }>;
}

export interface SerpSearchProvider {
  providerKey: string;
  providerMode: SerpProviderMode;
  search(request: SerpSearchProviderRequest): Promise<SerpSearchProviderResult>;
}
