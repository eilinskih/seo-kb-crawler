import { SeoPack } from '@seo-kb/seo-pack';
import { RetrievalOnlySafeguardStatus } from './domain/seo-agent-gateway-types';

export interface RetrievalOnlySafeguardResult {
  status: RetrievalOnlySafeguardStatus;
  warnings: string[];
}

export class RetrievalOnlySafeguardService {
  evaluate(input: {
    seoPack?: SeoPack;
    contextPackAvailable?: boolean;
    structuredFallbackAvailable: boolean;
  }): RetrievalOnlySafeguardResult {
    if (input.seoPack) {
      return { status: 'structured_context_available', warnings: [] };
    }

    if (input.structuredFallbackAvailable) {
      return {
        status: 'supplemental_context_only',
        warnings: [
          'SEO Pack is unavailable; structured fallback context is degraded.',
        ],
      };
    }

    if (input.contextPackAvailable) {
      return {
        status: 'blocked_raw_retrieval_only',
        warnings: [
          'Context Pack cannot be the only SEO generation context when structured SEO packs are missing.',
        ],
      };
    }

    return {
      status: 'blocked_raw_retrieval_only',
      warnings: ['No structured SEO context is available for generation.'],
    };
  }
}
