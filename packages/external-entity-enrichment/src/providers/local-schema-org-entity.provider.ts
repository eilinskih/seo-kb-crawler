import {
  ExternalEntityCandidate,
  ExternalEntityEnrichmentRequest,
  ExternalEntityProvider,
  ExternalEntityProviderDescriptor,
  ExternalEntityProviderResult,
  SchemaOrgEntitySignal,
} from '../domain/external-entity-enrichment-types';

export class LocalSchemaOrgEntityProvider implements ExternalEntityProvider {
  readonly providerKey = 'local_schema_org';
  readonly tier = 'local_signal' as const;
  readonly capabilities = ['schema_org_signals', 'aliases', 'entity_types'] as const;

  async getStatus(): Promise<ExternalEntityProviderDescriptor> {
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
    const candidates = (request.schemaOrgSignals ?? [])
      .map((signal) => normalizeSchemaOrgSignal(signal, request))
      .filter((candidate): candidate is ExternalEntityCandidate =>
        candidate !== null,
      );

    return {
      candidates,
      warnings: candidates.length === 0
        ? [{
            providerKey: this.providerKey,
            status: 'degraded',
            code: 'no_schema_org_signals',
            message: 'No local Schema.org entity signals were supplied.',
          }]
        : [],
    };
  }
}

function normalizeSchemaOrgSignal(
  signal: SchemaOrgEntitySignal,
  request: ExternalEntityEnrichmentRequest,
): ExternalEntityCandidate | null {
  const name = nonEmpty(signal.name) ?? request.entityName;
  if (!nonEmpty(name)) {
    return null;
  }

  const sameAs = uniqueStrings(signal.sameAs ?? []);
  const url = nonEmpty(signal.url);
  const urls = uniqueStrings(url ? [url, ...sameAs] : sameAs);
  const aliases = uniqueStrings(signal.alternateNames ?? []);
  const type = nonEmpty(signal.type);

  return {
    providerKey: 'local_schema_org',
    source: 'schema_org',
    externalId: urls[0] ?? null,
    externalIdType: urls[0] ? 'same_as_url' : null,
    name,
    description: nonEmpty(signal.description) ?? null,
    types: type ? [type] : [],
    aliases,
    urls,
    score: null,
    confidence: urls.length > 0 || type ? 'medium' : 'low',
    language: signal.language ?? request.language,
    metadata: signal.metadata,
    provenance: {
      providerKey: 'local_schema_org',
      source: 'schema_org',
      sourceUrl: signal.sourceUrl ?? null,
      sourceDocumentId: signal.sourceDocumentId ?? null,
      observedAt: request.now ?? null,
    },
  };
}

function nonEmpty(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
