import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import { Knex } from 'knex';
import {
  EntityAliasRecord,
  EntityMentionRecord,
  EntityRecord,
  EntityRepository,
  EntityReviewStatus,
  EntityType,
} from '../domain/entity-types';

interface EntityRow {
  id: string;
  canonical_name: string;
  normalized_canonical_name: string;
  entity_type: EntityType;
  vertical: string | null;
  description: string | null;
  confidence: string | number;
  source: EntityRecord['source'];
  review_status: EntityReviewStatus;
  created_at: Date;
  updated_at: Date;
}

interface AliasRow {
  id: string;
  entity_id: string;
  alias_text: string;
  normalized_alias_text: string;
  language: string | null;
  geo: EntityAliasRecord['geo'];
  geo_key: string | null;
  alias_type: EntityAliasRecord['aliasType'];
  confidence: string | number;
  review_status: EntityReviewStatus;
  source: EntityAliasRecord['source'];
  created_at: Date;
  updated_at: Date;
}

interface MentionRow {
  id: string;
  entity_id: string;
  alias_id: string | null;
  chunk_id: string;
  mention_text: string;
  start_offset: number | null;
  end_offset: number | null;
  location_hint: string | null;
  language: string | null;
  geo: EntityMentionRecord['geo'];
  confidence: string | number;
  source: EntityMentionRecord['source'];
  created_at: Date;
}

@Injectable()
export class KnexEntityRepository implements EntityRepository {
  private readonly knex: Knex;

  constructor(db: DbService) {
    this.knex = db.knex;
  }

  async createEntity(record: EntityRecord): Promise<void> {
    await this.knex('entities').insert(toEntityRow(record));
  }

  async createAlias(record: EntityAliasRecord): Promise<void> {
    await this.knex('entity_aliases').insert(toAliasRow(record));
  }

  async createMention(record: EntityMentionRecord): Promise<void> {
    await this.knex('entity_mentions').insert(toMentionRow(record));
  }

  async findEntityById(id: string): Promise<EntityRecord | null> {
    const row = await this.knex<EntityRow>('entities').where({ id }).first();
    return row ? fromEntityRow(row) : null;
  }

  async findAliasById(id: string): Promise<EntityAliasRecord | null> {
    const row = await this.knex<AliasRow>('entity_aliases').where({ id }).first();
    return row ? fromAliasRow(row) : null;
  }

  async findEntityByIdentity(input: {
    normalizedCanonicalName: string;
    entityType: EntityType;
    vertical: string | null;
  }): Promise<EntityRecord | null> {
    const query = this.knex<EntityRow>('entities')
      .where({
        normalized_canonical_name: input.normalizedCanonicalName,
        entity_type: input.entityType,
      });
    if (input.vertical === null) {
      query.whereNull('vertical');
    } else {
      query.where({ vertical: input.vertical });
    }
    const row = await query.first();
    return row ? fromEntityRow(row) : null;
  }

  async findAliasesByNormalizedText(input: {
    normalizedAliasText: string;
    language?: string;
    geoKey?: string | null;
    statuses: EntityReviewStatus[];
  }): Promise<EntityAliasRecord[]> {
    const query = this.knex<AliasRow>('entity_aliases')
      .where({
        normalized_alias_text: input.normalizedAliasText,
      })
      .whereIn('review_status', input.statuses);
    if (input.language !== undefined) {
      query.andWhere((builder) => {
        builder.where({ language: input.language }).orWhereNull('language');
      });
    }
    if (input.geoKey !== undefined) {
      query.andWhere((builder) => {
        builder.where({ geo_key: input.geoKey }).orWhereNull('geo_key');
      });
    }
    const rows = await query.orderBy('confidence', 'desc');
    return rows.map(fromAliasRow);
  }

  async findAliasesByNormalizedTexts(input: {
    normalizedAliasTexts: string[];
    language?: string;
    geoKey?: string | null;
    statuses: EntityReviewStatus[];
  }): Promise<EntityAliasRecord[]> {
    if (input.normalizedAliasTexts.length === 0) {
      return [];
    }
    const query = this.knex<AliasRow>('entity_aliases')
      .whereIn('normalized_alias_text', input.normalizedAliasTexts)
      .whereIn('review_status', input.statuses);
    if (input.language !== undefined) {
      query.andWhere((builder) => {
        builder.where({ language: input.language }).orWhereNull('language');
      });
    }
    if (input.geoKey !== undefined) {
      query.andWhere((builder) => {
        builder.where({ geo_key: input.geoKey }).orWhereNull('geo_key');
      });
    }
    const rows = await query.orderBy('confidence', 'desc');
    return rows.map(fromAliasRow);
  }

  async findApprovedAliasesByEntityIds(
    entityIds: string[],
  ): Promise<EntityAliasRecord[]> {
    if (entityIds.length === 0) {
      return [];
    }
    const rows = await this.knex<AliasRow>('entity_aliases')
      .whereIn('entity_id', entityIds)
      .where({ review_status: 'approved' })
      .orderBy(['entity_id', 'normalized_alias_text']);
    return rows.map(fromAliasRow);
  }
}

function toEntityRow(record: EntityRecord): EntityRow {
  return {
    id: record.id,
    canonical_name: record.canonicalName,
    normalized_canonical_name: record.normalizedCanonicalName,
    entity_type: record.entityType,
    vertical: record.vertical,
    description: record.description,
    confidence: record.confidence,
    source: record.source,
    review_status: record.reviewStatus,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function fromEntityRow(row: EntityRow): EntityRecord {
  return {
    id: row.id,
    canonicalName: row.canonical_name,
    normalizedCanonicalName: row.normalized_canonical_name,
    entityType: row.entity_type,
    vertical: row.vertical,
    description: row.description,
    confidence: Number(row.confidence),
    source: row.source,
    reviewStatus: row.review_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAliasRow(record: EntityAliasRecord): AliasRow {
  return {
    id: record.id,
    entity_id: record.entityId,
    alias_text: record.aliasText,
    normalized_alias_text: record.normalizedAliasText,
    language: record.language,
    geo: record.geo,
    geo_key: record.geoKey,
    alias_type: record.aliasType,
    confidence: record.confidence,
    review_status: record.reviewStatus,
    source: record.source,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function fromAliasRow(row: AliasRow): EntityAliasRecord {
  return {
    id: row.id,
    entityId: row.entity_id,
    aliasText: row.alias_text,
    normalizedAliasText: row.normalized_alias_text,
    language: row.language,
    geo: row.geo,
    geoKey: row.geo_key,
    aliasType: row.alias_type,
    confidence: Number(row.confidence),
    reviewStatus: row.review_status,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMentionRow(record: EntityMentionRecord): MentionRow {
  return {
    id: record.id,
    entity_id: record.entityId,
    alias_id: record.aliasId,
    chunk_id: record.chunkId,
    mention_text: record.mentionText,
    start_offset: record.startOffset,
    end_offset: record.endOffset,
    location_hint: record.locationHint,
    language: record.language,
    geo: record.geo,
    confidence: record.confidence,
    source: record.source,
    created_at: record.createdAt,
  };
}
