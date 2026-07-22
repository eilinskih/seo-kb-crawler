import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  KnowledgePackAliasRecord,
  KnowledgePackEntityRecord,
  KnowledgePackFactRecord,
  KnowledgePackOntologyRecord,
  KnowledgePackRepository,
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
