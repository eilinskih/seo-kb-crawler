import {
  ExternalEntityEnrichmentRequest,
  ExternalEntityProvider,
  ExternalEntityProviderDescriptor,
  ExternalEntityProviderResult,
} from '../domain/external-entity-enrichment-types';

export interface GoogleKnowledgeGraphProviderOptions {
  apiKey?: string;
  disabled?: boolean;
}

export class GoogleKnowledgeGraphProvider implements ExternalEntityProvider {
  readonly providerKey = 'google_knowledge_graph';
  readonly tier = 'paid_provider' as const;
  readonly capabilities = [
    'entity_lookup',
    'external_ids',
    'aliases',
    'entity_types',
  ] as const;

  constructor(private readonly options: GoogleKnowledgeGraphProviderOptions = {}) {}

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
    _request: ExternalEntityEnrichmentRequest,
  ): Promise<ExternalEntityProviderResult> {
    return {
      candidates: [],
      warnings: [{
        providerKey: this.providerKey,
        status: 'degraded',
        code: 'adapter_fetch_deferred',
        message: 'Google Knowledge Graph fetch execution is deferred.',
      }],
    };
  }
}
