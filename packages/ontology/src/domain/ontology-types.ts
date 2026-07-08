export type OntologyReviewStatus = 'draft' | 'approved' | 'deprecated';

export type RawFactStatus = 'pending' | 'normalized' | 'rejected';

export type PredicateResolutionStatus =
  | 'resolved'
  | 'pending_review'
  | 'deprecated'
  | 'not_found'
  | 'ambiguous';

export interface OntologyExample {
  text: string;
  note?: string;
}

export interface EntityTypeRegistryRecord {
  id: string;
  key: string;
  label: string;
  description: string;
  vertical: string | null;
  aliases: string[];
  examples: OntologyExample[];
  usageNotes: string | null;
  reviewStatus: OntologyReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttributeSchemaRecord {
  key: string;
  schema: Record<string, unknown>;
  description: string;
  examples: Record<string, unknown>[];
  reviewStatus: OntologyReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PredicateRegistryRecord {
  id: string;
  key: string;
  label: string;
  description: string;
  subjectEntityTypes: string[];
  objectEntityTypes: string[];
  attributeSchemaKey: string | null;
  vertical: string | null;
  aliases: string[];
  examples: OntologyExample[];
  usageNotes: string | null;
  reviewStatus: OntologyReviewStatus;
  replacementPredicateId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PredicateAliasRecord {
  id: string;
  predicateId: string;
  aliasText: string;
  normalizedAliasText: string;
  language: string | null;
  vertical: string | null;
  confidence: number;
  reviewStatus: OntologyReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface RawFactRecord {
  id: string;
  subjectEntityId: string;
  objectCandidate: unknown;
  predicateCandidate: string;
  attributesCandidate: Record<string, unknown>;
  sourceChunkId: string;
  extractionModel: {
    providerKey: string;
    modelKey: string;
    modelVersion: string;
  };
  confidence: number;
  status: RawFactStatus;
  normalizationNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CanonicalFactRecord {
  id: string;
  subjectEntityId: string;
  objectEntityId: string | null;
  predicateId: string;
  normalizedAttributes: Record<string, unknown>;
  sourceChunkId: string;
  confidence: number;
  provenance: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PredicateAliasResolutionInput {
  predicateCandidate: string;
  language?: string;
  vertical?: string;
  includeDraft?: boolean;
}

export interface PredicateAliasResolution {
  status: PredicateResolutionStatus;
  normalizedCandidate: string;
  predicate: PredicateRegistryRecord | null;
  alias: PredicateAliasRecord | null;
  candidates: PredicateAliasRecord[];
  reason: string;
}

export interface PredicateRegistrySnapshot {
  predicates: PredicateRegistryRecord[];
  aliases: PredicateAliasRecord[];
  attributeSchemas: AttributeSchemaRecord[];
  entityTypes: EntityTypeRegistryRecord[];
}

export interface PredicateAliasResolverRepository {
  findAliasesByNormalizedText(input: {
    normalizedAliasText: string;
    language?: string;
    vertical?: string;
    includeDraft: boolean;
  }): Promise<PredicateAliasRecord[]>;
  findPredicateById(id: string): Promise<PredicateRegistryRecord | null>;
}

export class OntologyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OntologyValidationError';
  }
}
