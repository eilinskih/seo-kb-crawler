import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  KnowledgePackAliasRecord,
  KnowledgePackEntityRecord,
  KnowledgePackFactRecord,
  KnowledgePackFactTrustRecord,
  KnowledgePackOntologyRecord,
  KnowledgePackRepository,
  KnowledgePackSourceTrustRecord,
  KnowledgePackEntityTrustRecord,
} from '../domain/knowledge-pack-types';

interface CanonicalFactRow {
  id: string;
  subject_entity_id: string;
  object_entity_id: string | null;
  predicate_id: string;
  predicate_key: string | null;
  normalized_attributes: Record<string, unknown>;
  source_chunk_id: string;
  confidence: string | number;
  provenance: Record<string, unknown>;
}

interface EntityRow {
  id: string;
  canonical_name: string;
  entity_type: string;
  vertical: string | null;
  confidence: string | number;
}

interface AliasRow {
  id: string;
  entity_id: string;
  alias_text: string;
  alias_type: string;
  language: string | null;
  confidence: string | number;
}

interface OntologyPredicateRow {
  id: string;
  key: string;
  label: string;
  description: string;
}

interface SourceTrustRow {
  source_url: string;
  canonical_url: string | null;
  source_type: string;
  review_status: string;
  rule_version: string;
  score_components: Record<string, unknown>;
  source_trust_score: string | number;
}

interface FactScoreRow {
  canonical_fact_id: string;
  evidence_strength: string | number;
  source_trust_score: string | number | null;
  extraction_confidence: string | number;
  normalization_confidence: string | number | null;
  final_confidence: string | number;
  score_components: Record<string, unknown>;
  uncertainty_flags: string[];
}

interface EntityScoreRow {
  entity_id: string;
  alias_confidence: string | number | null;
  mention_count: number;
  source_diversity_score: string | number;
  average_source_trust: string | number | null;
  final_confidence: string | number;
  score_components: Record<string, unknown>;
}

@Injectable()
export class KnexKnowledgePackRepository implements KnowledgePackRepository {
  constructor(private readonly db: DbService) {}

  async findCanonicalFactsByChunkIds(
    chunkIds: string[],
  ): Promise<KnowledgePackFactRecord[]> {
    if (chunkIds.length === 0) {
      return [];
    }

    const rows = await this.db.knex<CanonicalFactRow>('canonical_facts')
      .leftJoin(
        'ontology_predicates',
        'canonical_facts.predicate_id',
        'ontology_predicates.id',
      )
      .whereIn('canonical_facts.source_chunk_id', chunkIds)
      .orderBy('canonical_facts.confidence', 'desc')
      .orderBy('canonical_facts.id', 'asc')
      .select([
        'canonical_facts.id',
        'canonical_facts.subject_entity_id',
        'canonical_facts.object_entity_id',
        'canonical_facts.predicate_id',
        'ontology_predicates.key as predicate_key',
        'canonical_facts.normalized_attributes',
        'canonical_facts.source_chunk_id',
        'canonical_facts.confidence',
        'canonical_facts.provenance',
      ]);

    return rows.map(toFactRecord);
  }

  async findEntitiesByIds(
    entityIds: string[],
  ): Promise<KnowledgePackEntityRecord[]> {
    if (entityIds.length === 0) {
      return [];
    }

    const rows = await this.db.knex<EntityRow>('entities')
      .whereIn('id', entityIds)
      .orderBy('canonical_name', 'asc')
      .select(['id', 'canonical_name', 'entity_type', 'vertical', 'confidence']);

    return rows.map(toEntityRecord);
  }

  async findApprovedAliasesByEntityIds(
    entityIds: string[],
  ): Promise<KnowledgePackAliasRecord[]> {
    if (entityIds.length === 0) {
      return [];
    }

    const rows = await this.db.knex<AliasRow>('entity_aliases')
      .whereIn('entity_id', entityIds)
      .where({ review_status: 'approved' })
      .orderBy('entity_id', 'asc')
      .orderBy('confidence', 'desc')
      .orderBy('alias_text', 'asc')
      .select([
        'id',
        'entity_id',
        'alias_text',
        'alias_type',
        'language',
        'confidence',
      ]);

    return rows.map(toAliasRecord);
  }

  async findOntologyReferencesByPredicateIds(
    predicateIds: string[],
  ): Promise<KnowledgePackOntologyRecord[]> {
    if (predicateIds.length === 0) {
      return [];
    }

    const rows = await this.db.knex<OntologyPredicateRow>('ontology_predicates')
      .whereIn('id', predicateIds)
      .orderBy('key', 'asc')
      .select(['id', 'key', 'label', 'description']);

    return rows.map(toOntologyRecord);
  }

  async findSourceTrustByUrls(
    urls: string[],
  ): Promise<KnowledgePackSourceTrustRecord[]> {
    if (urls.length === 0) {
      return [];
    }

    const rows = await this.db.knex<SourceTrustRow>('source_profiles')
      .where((builder) =>
        builder
          .whereIn('source_url', urls)
          .orWhereIn('canonical_url', urls),
      )
      .orderBy('source_trust_score', 'desc')
      .select([
        'source_url',
        'canonical_url',
        'source_type',
        'review_status',
        'rule_version',
        'score_components',
        'source_trust_score',
      ]);

    return rows.map(toSourceTrustRecord);
  }

  async findFactTrustByFactIds(
    factIds: string[],
  ): Promise<KnowledgePackFactTrustRecord[]> {
    if (factIds.length === 0) {
      return [];
    }

    const rows = await this.db.knex<FactScoreRow>('fact_scores')
      .whereIn('canonical_fact_id', factIds)
      .select([
        'canonical_fact_id',
        'evidence_strength',
        'source_trust_score',
        'extraction_confidence',
        'normalization_confidence',
        'final_confidence',
        'score_components',
        'uncertainty_flags',
      ]);

    return rows.map(toFactTrustRecord);
  }

  async findEntityTrustByEntityIds(
    entityIds: string[],
  ): Promise<KnowledgePackEntityTrustRecord[]> {
    if (entityIds.length === 0) {
      return [];
    }

    const rows = await this.db.knex<EntityScoreRow>('entity_scores')
      .whereIn('entity_id', entityIds)
      .select([
        'entity_id',
        'alias_confidence',
        'mention_count',
        'source_diversity_score',
        'average_source_trust',
        'final_confidence',
        'score_components',
      ]);

    return rows.map(toEntityTrustRecord);
  }
}

function toFactRecord(row: CanonicalFactRow): KnowledgePackFactRecord {
  return {
    factId: row.id,
    subjectEntityId: row.subject_entity_id,
    objectEntityId: row.object_entity_id,
    predicateId: row.predicate_id,
    predicateKey: row.predicate_key,
    normalizedAttributes: row.normalized_attributes,
    sourceChunkId: row.source_chunk_id,
    confidence: Number(row.confidence),
    provenance: row.provenance,
  };
}

function toEntityRecord(row: EntityRow): KnowledgePackEntityRecord {
  return {
    entityId: row.id,
    canonicalName: row.canonical_name,
    entityType: row.entity_type,
    vertical: row.vertical,
    confidence: Number(row.confidence),
  };
}

function toAliasRecord(row: AliasRow): KnowledgePackAliasRecord {
  return {
    aliasId: row.id,
    entityId: row.entity_id,
    aliasText: row.alias_text,
    aliasType: row.alias_type,
    language: row.language,
    confidence: Number(row.confidence),
  };
}

function toOntologyRecord(row: OntologyPredicateRow): KnowledgePackOntologyRecord {
  return {
    predicateId: row.id,
    predicateKey: row.key,
    label: row.label,
    description: row.description,
  };
}

function toSourceTrustRecord(row: SourceTrustRow): KnowledgePackSourceTrustRecord {
  return {
    sourceUrl: row.source_url,
    canonicalUrl: row.canonical_url,
    sourceType: row.source_type,
    reviewStatus: row.review_status,
    score: Number(row.source_trust_score),
    ruleVersion: row.rule_version,
    components: row.score_components,
  };
}

function toFactTrustRecord(row: FactScoreRow): KnowledgePackFactTrustRecord {
  return {
    factId: row.canonical_fact_id,
    evidenceStrengthScore: Number(row.evidence_strength),
    sourceTrustScore: row.source_trust_score === null
      ? null
      : Number(row.source_trust_score),
    extractionConfidence: Number(row.extraction_confidence),
    normalizationConfidence: row.normalization_confidence === null
      ? null
      : Number(row.normalization_confidence),
    finalConfidence: Number(row.final_confidence),
    uncertaintyFlags: row.uncertainty_flags,
    components: row.score_components,
  };
}

function toEntityTrustRecord(row: EntityScoreRow): KnowledgePackEntityTrustRecord {
  return {
    entityId: row.entity_id,
    aliasConfidence: row.alias_confidence === null
      ? null
      : Number(row.alias_confidence),
    mentionCount: row.mention_count,
    sourceDiversityScore: Number(row.source_diversity_score),
    averageSourceTrust: row.average_source_trust === null
      ? null
      : Number(row.average_source_trust),
    finalConfidence: Number(row.final_confidence),
    components: row.score_components,
  };
}
