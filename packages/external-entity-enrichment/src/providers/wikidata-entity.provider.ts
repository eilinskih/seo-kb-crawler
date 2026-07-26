import {
  ExternalEntityEnrichmentRequest,
  ExternalEntityProvider,
  ExternalEntityProviderDescriptor,
  ExternalEntityProviderResult,
} from '../domain/external-entity-enrichment-types';

export interface WikidataEntityProviderOptions {
  enabled?: boolean;
}

export class WikidataEntityProvider implements ExternalEntityProvider {
  readonly providerKey = 'wikidata';
  readonly tier = 'public_provider' as const;
  readonly capabilities = [
    'entity_lookup',
    'external_ids',
    'aliases',
    'multilingual_aliases',
    'entity_types',
    'sitelinks',
  ] as const;

  constructor(private readonly options: WikidataEntityProviderOptions = {}) {}

  async getStatus(): Promise<ExternalEntityProviderDescriptor> {
    if (!this.options.enabled) {
      return {
        providerKey: this.providerKey,
        tier: this.tier,
        capabilities: [...this.capabilities],
        status: 'disabled',
        warnings: [{
          providerKey: this.providerKey,
          status: 'disabled',
          code: 'provider_disabled_by_default',
          message: 'Wikidata enrichment is disabled until scheduled provider execution is configured.',
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
        message: 'Wikidata fetch execution is deferred.',
      }],
    };
  }
}
