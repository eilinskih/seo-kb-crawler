export type EntityType =
  | 'brand'
  | 'product'
  | 'model'
  | 'procedure'
  | 'place'
  | 'organization'
  | 'person'
  | 'law'
  | 'software'
  | 'technology'
  | 'concept'
  | 'unknown';

export type AliasType =
  | 'exact'
  | 'abbreviation'
  | 'translation'
  | 'transliteration'
  | 'spelling_variant'
  | 'brand_model_variant'
  | 'other';

export type EntityReviewStatus =
  | 'approved'
  | 'suggested'
  | 'rejected'
  | 'deprecated';

export interface EntityGeoHint {
  countryCode?: string;
  regionCode?: string;
  city?: string;
}

export interface EntitySourceMetadata {
  sourceType: 'manual' | 'extraction' | 'import' | 'external_provider';
  sourceId?: string;
  url?: string;
  note?: string;
}

export interface EntityRecord {
  id: string;
  canonicalName: string;
  normalizedCanonicalName: string;
  entityType: EntityType;
  vertical: string | null;
  description: string | null;
  confidence: number;
  source: EntitySourceMetadata;
  reviewStatus: EntityReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityAliasRecord {
  id: string;
  entityId: string;
  aliasText: string;
  normalizedAliasText: string;
  language: string | null;
  geo: EntityGeoHint | null;
  geoKey: string | null;
  aliasType: AliasType;
  confidence: number;
  reviewStatus: EntityReviewStatus;
  source: EntitySourceMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityMentionRecord {
  id: string;
  entityId: string;
  aliasId: string | null;
  chunkId: string;
  mentionText: string;
  startOffset: number | null;
  endOffset: number | null;
  locationHint: string | null;
  language: string | null;
  geo: EntityGeoHint | null;
  confidence: number;
  source: EntitySourceMetadata;
  createdAt: Date;
}

export interface CreateEntityInput {
  canonicalName: string;
  entityType: EntityType;
  vertical?: string;
  description?: string;
  confidence?: number;
  source?: EntitySourceMetadata;
  reviewStatus?: EntityReviewStatus;
}

export interface CreateAliasInput {
  entityId: string;
  aliasText: string;
  language?: string;
  geo?: EntityGeoHint;
  aliasType: AliasType;
  confidence?: number;
  source?: EntitySourceMetadata;
  reviewStatus?: EntityReviewStatus;
}

export interface CreateMentionInput {
  entityId: string;
  aliasId?: string;
  chunkId: string;
  mentionText: string;
  startOffset?: number;
  endOffset?: number;
  locationHint?: string;
  language?: string;
  geo?: EntityGeoHint;
  confidence?: number;
  source?: EntitySourceMetadata;
}

export interface AliasLookupInput {
  aliasText: string;
  language?: string;
  geo?: EntityGeoHint;
  includeSuggested?: boolean;
}

export interface EntityQueryExpansionInput {
  query: string;
  language?: string;
  geo?: EntityGeoHint;
  includeSuggested?: boolean;
}

export interface EntityReference {
  entityId: string;
  canonicalName: string;
  entityType: EntityType;
  vertical: string | null;
  confidence: number;
}

export interface AliasReference {
  aliasId: string;
  entityId: string;
  aliasText: string;
  aliasType: AliasType;
  language: string | null;
  geo: EntityGeoHint | null;
  confidence: number;
  reviewStatus: EntityReviewStatus;
}

export interface EntityQueryExpansion {
  originalQuery: string;
  normalizedQuery: string;
  canonicalEntities: EntityReference[];
  aliases: AliasReference[];
  expandedTerms: string[];
}

export interface EntityRepository {
  createEntity(record: EntityRecord): Promise<void>;
  createAlias(record: EntityAliasRecord): Promise<void>;
  createMention(record: EntityMentionRecord): Promise<void>;
  findEntityById(id: string): Promise<EntityRecord | null>;
  findAliasById(id: string): Promise<EntityAliasRecord | null>;
  findEntityByIdentity(input: {
    normalizedCanonicalName: string;
    entityType: EntityType;
    vertical: string | null;
  }): Promise<EntityRecord | null>;
  findAliasesByNormalizedText(input: {
    normalizedAliasText: string;
    language?: string;
    geoKey?: string | null;
    statuses: EntityReviewStatus[];
  }): Promise<EntityAliasRecord[]>;
  findApprovedAliasesByEntityIds(entityIds: string[]): Promise<EntityAliasRecord[]>;
}

export class EntityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EntityValidationError';
  }
}

export class EntityNotFoundError extends Error {
  constructor(id: string) {
    super(`Entity not found: ${id}`);
    this.name = 'EntityNotFoundError';
  }
}
