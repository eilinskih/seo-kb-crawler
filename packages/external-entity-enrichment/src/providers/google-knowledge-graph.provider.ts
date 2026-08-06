import {
  ExternalEntityEnrichmentRequest,
  ExternalEntityProvider,
  ExternalEntityProviderDescriptor,
  ExternalEntityProviderResult,
} from '../domain/external-entity-enrichment-types';
import {
  GoogleKnowledgeGraphSearchResponse,
  normalizeGoogleKnowledgeGraphResponse,
} from './google-knowledge-graph.normalizer';

export interface GoogleKnowledgeGraphProviderOptions {
  apiKey?: string;
  disabled?: boolean;
  endpoint?: string;
  limit?: number;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}

interface FetchLikeResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

type FetchLike = (
  url: string,
  init?: {
    signal?: AbortSignal;
  },
) => Promise<FetchLikeResponse>;

export class GoogleKnowledgeGraphProvider implements ExternalEntityProvider {
  readonly providerKey = 'google_knowledge_graph';
  readonly tier = 'paid_provider' as const;
  readonly capabilities = [
    'entity_lookup',
    'external_ids',
    'aliases',
    'entity_types',
  ] as const;

  private readonly endpoint: string;
  private readonly limit: number;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(private readonly options: GoogleKnowledgeGraphProviderOptions = {}) {
    this.endpoint =
      options.endpoint ?? 'https://kgsearch.googleapis.com/v1/entities:search';
    this.limit = options.limit ?? 5;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getStatus(): Promise<ExternalEntityProviderDescriptor> {
    if (this.options.disabled) {
      return {
        providerKey: this.providerKey,
        tier: this.tier,
        capabilities: [...this.capabilities],
        status: 'disabled',
      };
    }

    if (!this.options.apiKey) {
      return {
        providerKey: this.providerKey,
        tier: this.tier,
        capabilities: [...this.capabilities],
        status: 'misconfigured',
        warnings: [{
          providerKey: this.providerKey,
          status: 'misconfigured',
          code: 'missing_api_key',
          message: 'Google Knowledge Graph API key is not configured.',
        }],
      };
    }

    return {
      providerKey: this.providerKey,
      tier: this.tier,
      capabilities: [...this.capabilities],
      status: 'available',
    };
  }

  async enrich(
    request: ExternalEntityEnrichmentRequest,
  ): Promise<ExternalEntityProviderResult> {
    const status = await this.getStatus();
    if (status.status !== 'available') {
      return {
        candidates: [],
        warnings: status.warnings,
      };
    }

    const response = await this.search(request);

    return {
      candidates: normalizeGoogleKnowledgeGraphResponse(response, request),
    };
  }

  private async search(
    request: ExternalEntityEnrichmentRequest,
  ): Promise<GoogleKnowledgeGraphSearchResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const url = new URL(this.endpoint);
    url.searchParams.set('query', request.entityName);
    url.searchParams.set('limit', String(this.limit));
    url.searchParams.set('indent', 'false');
    url.searchParams.set('key', this.options.apiKey as string);

    if (request.language) {
      url.searchParams.set('languages', request.language);
    }

    try {
      const response = await this.fetchImpl(url.toString(), {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Google Knowledge Graph API returned HTTP ${response.status}: ${await response.text()}`,
        );
      }

      return response.json() as Promise<GoogleKnowledgeGraphSearchResponse>;
    } finally {
      clearTimeout(timeout);
    }
  }
}
