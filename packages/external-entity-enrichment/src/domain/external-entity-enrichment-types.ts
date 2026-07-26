export type ExternalEntityProviderKey = string;

export type ExternalEntityProviderCapability =
  | 'entity_lookup'
  | 'external_ids'
  | 'aliases'
  | 'multilingual_aliases'
  | 'entity_types'
  | 'sitelinks'
  | 'schema_org_signals';

export type ExternalEntityProviderStatus =
  | 'available'
  | 'disabled'
  | 'misconfigured'
  | 'rate_limited'
  | 'unavailable'
  | 'degraded';

export type ExternalEntityProviderTier =
  | 'local_signal'
  | 'public_provider'
  | 'paid_provider';

export type ExternalEntityConfidence = 'unknown' | 'low' | 'medium' | 'high';

export type ExternalEntityCandidateSource =
  | 'google_knowledge_graph'
  | 'wikidata'
  | 'schema_org'
  | 'other';

export interface ExternalEntityGeo {
  countryCode?: string;
  regionCode?: string;
  city?: string;
}

export interface ExternalEntityProviderWarning {
  providerKey: ExternalEntityProviderKey;
  status: ExternalEntityProviderStatus;
  code: string;
  message: string;
}

export interface ExternalEntityProviderDescriptor {
  providerKey: ExternalEntityProviderKey;
  tier: ExternalEntityProviderTier;
  capabilities: ReadonlyArray<ExternalEntityProviderCapability>;
  status: ExternalEntityProviderStatus;
  warnings?: ExternalEntityProviderWarning[];
}

export interface SchemaOrgEntitySignal {
  sourceDocumentId?: string;
  sourceUrl?: string;
  type?: string;
  name?: string;
  alternateNames?: string[];
  sameAs?: string[];
  url?: string;
  description?: string;
  language?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface ExternalEntityEnrichmentRequest {
  entityId?: string;
  entityName: string;
  entityType?: string;
  vertical?: string;
  language?: string;
  geo?: ExternalEntityGeo;
  schemaOrgSignals?: SchemaOrgEntitySignal[];
  requestedCapabilities?: ReadonlyArray<ExternalEntityProviderCapability>;
  now?: string;
}

export interface ExternalEntityProvenance {
  providerKey: ExternalEntityProviderKey;
  source: ExternalEntityCandidateSource;
  sourceUrl?: string | null;
  sourceDocumentId?: string | null;
  observedAt: string | null;
}

export interface ExternalEntityCandidate {
  providerKey: ExternalEntityProviderKey;
  source: ExternalEntityCandidateSource;
  externalId: string | null;
  externalIdType: string | null;
  name: string;
  description: string | null;
  types: string[];
  aliases: string[];
  urls: string[];
  score: number | null;
  confidence: ExternalEntityConfidence;
  language?: string;
  metadata?: Record<string, string | number | boolean | null>;
  provenance: ExternalEntityProvenance;
}

export interface EntityExternalIdSignal {
  providerKey: ExternalEntityProviderKey;
  externalId: string;
  externalIdType: string;
  confidence: ExternalEntityConfidence;
  sourceUrl?: string | null;
  observedAt: string | null;
}

export interface ExternalEntityProviderResult {
  candidates: ExternalEntityCandidate[];
  warnings?: ExternalEntityProviderWarning[];
}

export interface ExternalEntityEnrichmentPack {
  request: ExternalEntityEnrichmentRequest;
  generatedAt: string;
  degraded: boolean;
  providerStatuses: ExternalEntityProviderDescriptor[];
  warnings: ExternalEntityProviderWarning[];
  candidates: ExternalEntityCandidate[];
  externalIds: EntityExternalIdSignal[];
}

export interface ExternalEntityProvider {
  readonly providerKey: ExternalEntityProviderKey;
  readonly tier: ExternalEntityProviderTier;
  readonly capabilities: ReadonlyArray<ExternalEntityProviderCapability>;
  getStatus(): Promise<ExternalEntityProviderDescriptor>;
  enrich(
    request: ExternalEntityEnrichmentRequest,
  ): Promise<ExternalEntityProviderResult>;
}
