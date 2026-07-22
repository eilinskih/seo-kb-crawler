import { GeoHint } from '@seo-kb/content-processing';
import { RankingProfileName, RetrievalResult } from '@seo-kb/retrieval';

export type KnowledgePackProfileName =
  | 'article_generation'
  | 'competitor_research'
  | 'content_planning'
  | 'entity_research'
  | 'fact_verification';

export interface KnowledgePackGeoInput {
  countryCode?: string;
  regionCode?: string;
  city?: string;
}

export interface KnowledgePackRequest {
  query: string;
  topicId?: string;
  language?: string;
  geo?: KnowledgePackGeoInput;
  vertical?: string;
  profile: KnowledgePackProfileName;
  limit?: number;
  includeDebug?: boolean;
  includeRawRetrieval?: boolean;
}

export interface KnowledgePackProfile {
  name: KnowledgePackProfileName;
  rankingProfile: RankingProfileName;
  defaultLimit: number;
  includeRawEvidenceText: boolean;
  preserveSourceDiversity: boolean;
  prioritizeFacts: boolean;
}

export interface KnowledgePackEntity {
  entityId: string;
  canonicalName: string;
  entityType: string;
  vertical: string | null;
  confidence: number;
}

export interface KnowledgePackAlias {
  aliasId: string;
  entityId: string;
  aliasText: string;
  aliasType: string;
  language: string | null;
  confidence: number;
}

export interface KnowledgePackFact {
  factId: string;
  subjectEntityId: string;
  objectEntityId: string | null;
  predicateId: string;
  predicateKey: string | null;
  normalizedAttributes: Record<string, unknown>;
  confidence: number;
  provenance: Record<string, unknown>;
  supportingChunkIds: string[];
  sourceIds: string[];
}

export interface KnowledgePackEvidenceChunk {
  chunkId: string;
  documentId: string;
  documentVersionId: string;
  sourceIds: string[];
  headingPath: string[];
  sectionTitle: string | null;
  chunkType: string;
  language: string | null;
  geoHints: GeoHint[];
  text: string;
  score: number;
}

export interface KnowledgePackSource {
  id: string;
  sourceUrl: string;
  canonicalUrl: string | null;
  sourceDomain: string | null;
  language: string | null;
  geoHints: GeoHint[];
}

export interface KnowledgePackOntologyReference {
  predicateId: string;
  predicateKey: string;
  label: string;
  description: string;
}

export interface KnowledgePackEvidenceGap {
  code:
    | 'no_canonical_facts'
    | 'weak_fact_support'
    | 'single_source_support'
    | 'missing_entity_aliases'
    | 'missing_ontology_reference'
    | 'retrieval_degraded'
    | 'possible_conflict_unresolved';
  detail: string;
}

export interface KnowledgePackConfidence {
  level: 'unknown' | 'low' | 'medium' | 'high';
  factCount: number;
  sourceCount: number;
  averageFactConfidence: number | null;
}

export interface KnowledgePackResponse {
  normalizedQuery: string;
  profile: KnowledgePackProfileName;
  entities: KnowledgePackEntity[];
  aliases: KnowledgePackAlias[];
  facts: KnowledgePackFact[];
  evidenceChunks: KnowledgePackEvidenceChunk[];
  sources: KnowledgePackSource[];
  ontologyReferences: KnowledgePackOntologyReference[];
  evidenceGaps: KnowledgePackEvidenceGap[];
  confidence: KnowledgePackConfidence;
  retrieval: {
    degraded: boolean;
    warnings: string[];
    resultCount: number;
  };
  rawRetrieval?: RetrievalResult[];
  debug?: {
    profile: KnowledgePackProfile;
  };
}

export interface KnowledgePackFactRecord {
  factId: string;
  subjectEntityId: string;
  objectEntityId: string | null;
  predicateId: string;
  predicateKey: string | null;
  normalizedAttributes: Record<string, unknown>;
  sourceChunkId: string;
  confidence: number;
  provenance: Record<string, unknown>;
}

export interface KnowledgePackEntityRecord extends KnowledgePackEntity {}

export interface KnowledgePackAliasRecord extends KnowledgePackAlias {}

export interface KnowledgePackOntologyRecord
  extends KnowledgePackOntologyReference {}

export interface KnowledgePackRepository {
  findCanonicalFactsByChunkIds(chunkIds: string[]): Promise<KnowledgePackFactRecord[]>;
  findEntitiesByIds(entityIds: string[]): Promise<KnowledgePackEntityRecord[]>;
  findApprovedAliasesByEntityIds(entityIds: string[]): Promise<KnowledgePackAliasRecord[]>;
  findOntologyReferencesByPredicateIds(
    predicateIds: string[],
  ): Promise<KnowledgePackOntologyRecord[]>;
}

export class KnowledgePackValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KnowledgePackValidationError';
  }
}
