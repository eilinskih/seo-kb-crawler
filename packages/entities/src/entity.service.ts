import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  normalizeEntityLookupText,
  normalizeEntityText,
  normalizeGeoKey,
  normalizeOptionalText,
} from './domain/entity-normalization';
import {
  AliasLookupInput,
  AliasReference,
  CreateAliasInput,
  CreateEntityInput,
  CreateMentionInput,
  EntityAliasRecord,
  EntityMentionRecord,
  EntityNotFoundError,
  EntityQueryExpansion,
  EntityQueryExpansionInput,
  EntityRecord,
  EntityReference,
  EntityRepository,
  EntityReviewStatus,
  EntitySourceMetadata,
  EntityTextMention,
  EntityTextMentionInput,
  EntityValidationError,
} from './domain/entity-types';
import { ENTITY_REPOSITORY } from './entities.tokens';

const defaultSource: EntitySourceMetadata = {
  sourceType: 'manual',
};

@Injectable()
export class EntityService {
  constructor(
    @Inject(ENTITY_REPOSITORY)
    private readonly repository: EntityRepository,
  ) {}

  async createEntity(input: CreateEntityInput): Promise<EntityRecord> {
    const now = new Date();
    const canonicalName = normalizeEntityText(
      input.canonicalName,
      'canonicalName',
    );
    const normalizedCanonicalName = normalizeEntityLookupText(
      canonicalName,
      'canonicalName',
    );
    const vertical = normalizeOptionalText(input.vertical);
    const existing = await this.repository.findEntityByIdentity({
      normalizedCanonicalName,
      entityType: input.entityType,
      vertical,
    });
    if (existing) {
      return existing;
    }
    const record: EntityRecord = {
      id: randomUUID(),
      canonicalName,
      normalizedCanonicalName,
      entityType: input.entityType,
      vertical,
      description: normalizeOptionalText(input.description),
      confidence: normalizeConfidence(input.confidence),
      source: input.source ?? defaultSource,
      reviewStatus: input.reviewStatus ?? 'approved',
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.createEntity(record);
    return record;
  }

  async addAlias(input: CreateAliasInput): Promise<EntityAliasRecord> {
    await this.requireEntity(input.entityId);
    const now = new Date();
    const aliasText = normalizeEntityText(input.aliasText, 'aliasText');
    const record: EntityAliasRecord = {
      id: randomUUID(),
      entityId: input.entityId,
      aliasText,
      normalizedAliasText: normalizeEntityLookupText(aliasText, 'aliasText'),
      language: normalizeOptionalText(input.language),
      geo: input.geo ?? null,
      geoKey: normalizeGeoKey(input.geo),
      aliasType: input.aliasType,
      confidence: normalizeConfidence(input.confidence),
      reviewStatus: input.reviewStatus ?? 'approved',
      source: input.source ?? defaultSource,
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.createAlias(record);
    return record;
  }

  async recordMention(input: CreateMentionInput): Promise<EntityMentionRecord> {
    await this.requireEntity(input.entityId);
    if (input.aliasId) {
      await this.requireAliasForEntity(input.aliasId, input.entityId);
    }
    const mentionText = normalizeEntityText(input.mentionText, 'mentionText');
    const record: EntityMentionRecord = {
      id: randomUUID(),
      entityId: input.entityId,
      aliasId: input.aliasId ?? null,
      chunkId: normalizeEntityText(input.chunkId, 'chunkId'),
      mentionText,
      startOffset: input.startOffset ?? null,
      endOffset: input.endOffset ?? null,
      locationHint: normalizeOptionalText(input.locationHint),
      language: normalizeOptionalText(input.language),
      geo: input.geo ?? null,
      confidence: normalizeConfidence(input.confidence),
      source: input.source ?? defaultSource,
      createdAt: new Date(),
    };
    await this.repository.createMention(record);
    return record;
  }

  async lookupAliases(input: AliasLookupInput): Promise<AliasReference[]> {
    const aliases = await this.repository.findAliasesByNormalizedText({
      normalizedAliasText: normalizeEntityLookupText(
        input.aliasText,
        'aliasText',
      ),
      language: input.language,
      geoKey: normalizeGeoKey(input.geo),
      statuses: input.includeSuggested ? ['approved', 'suggested'] : ['approved'],
    });
    return aliases.map(toAliasReference);
  }

  async expandQuery(
    input: EntityQueryExpansionInput,
  ): Promise<EntityQueryExpansion> {
    const normalizedQuery = normalizeEntityLookupText(input.query, 'query');
    const matchingAliases = await this.repository.findAliasesByNormalizedText({
      normalizedAliasText: normalizedQuery,
      language: input.language,
      geoKey: normalizeGeoKey(input.geo),
      statuses: input.includeSuggested ? ['approved', 'suggested'] : ['approved'],
    });
    const entityIds = unique(matchingAliases.map((alias) => alias.entityId));
    const entities = (await Promise.all(
      entityIds.map((entityId) => this.repository.findEntityById(entityId)),
    )).filter((entity): entity is EntityRecord => Boolean(entity));
    const aliases = entityIds.length > 0
      ? await this.repository.findApprovedAliasesByEntityIds(entityIds)
      : [];

    return {
      originalQuery: input.query,
      normalizedQuery,
      canonicalEntities: entities.map(toEntityReference),
      aliases: matchingAliases.map(toAliasReference),
      expandedTerms: buildExpandedTerms(input.query, entities, aliases),
    };
  }

  async findMentionsInText(
    input: EntityTextMentionInput,
  ): Promise<EntityTextMention[]> {
    const normalizedTexts = normalizedNgrams(input.text);
    if (normalizedTexts.length === 0) {
      return [];
    }
    const aliases = await this.repository.findAliasesByNormalizedTexts({
      normalizedAliasTexts: normalizedTexts,
      language: input.language,
      geoKey: normalizeGeoKey(input.geo),
      statuses: input.includeSuggested ? ['approved', 'suggested'] : ['approved'],
    });
    const entityIds = unique(aliases.map((alias) => alias.entityId));
    const entities = new Map(
      (await Promise.all(
        entityIds.map((entityId) => this.repository.findEntityById(entityId)),
      ))
        .filter((entity): entity is EntityRecord => Boolean(entity))
        .map((entity) => [entity.id, entity]),
    );

    return aliases
      .map((alias) => {
        const entity = entities.get(alias.entityId);
        if (!entity) {
          return null;
        }
        return {
          entity: toEntityReference(entity),
          alias: toAliasReference(alias),
          mentionText: alias.aliasText,
          confidence: Math.min(entity.confidence, alias.confidence),
        };
      })
      .filter((mention): mention is EntityTextMention => Boolean(mention))
      .sort((a, b) =>
        b.confidence - a.confidence ||
        a.entity.canonicalName.localeCompare(b.entity.canonicalName),
      );
  }

  private async requireEntity(id: string): Promise<EntityRecord> {
    const entity = await this.repository.findEntityById(id);
    if (!entity) {
      throw new EntityNotFoundError(id);
    }
    return entity;
  }

  private async requireAliasForEntity(
    aliasId: string,
    entityId: string,
  ): Promise<void> {
    const alias = await this.repository.findAliasById(aliasId);
    if (!alias) {
      throw new EntityValidationError(`Alias not found: ${aliasId}`);
    }
    if (alias.entityId !== entityId) {
      throw new EntityValidationError(
        `Alias ${aliasId} does not belong to entity ${entityId}`,
      );
    }
  }
}

function normalizeConfidence(value = 1): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new EntityValidationError('confidence must be between 0 and 1');
  }
  return value;
}

function toEntityReference(entity: EntityRecord): EntityReference {
  return {
    entityId: entity.id,
    canonicalName: entity.canonicalName,
    entityType: entity.entityType,
    vertical: entity.vertical,
    confidence: entity.confidence,
  };
}

function toAliasReference(alias: EntityAliasRecord): AliasReference {
  return {
    aliasId: alias.id,
    entityId: alias.entityId,
    aliasText: alias.aliasText,
    aliasType: alias.aliasType,
    language: alias.language,
    geo: alias.geo,
    confidence: alias.confidence,
    reviewStatus: alias.reviewStatus,
  };
}

function buildExpandedTerms(
  originalQuery: string,
  entities: EntityRecord[],
  aliases: EntityAliasRecord[],
): string[] {
  const terms = [
    ...entities.map((entity) => entity.canonicalName),
    ...aliases.map((alias) => alias.aliasText),
  ];
  const originalNormalized = normalizeEntityLookupText(originalQuery, 'query');
  return unique(terms)
    .filter((term) => normalizeEntityLookupText(term) !== originalNormalized)
    .sort((a, b) => a.localeCompare(b));
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function normalizedNgrams(text: string): string[] {
  const normalized = normalizeEntityLookupText(text, 'text');
  const tokens = normalized.split(' ').filter(Boolean);
  const values: string[] = [];
  const maxLength = Math.min(6, tokens.length);
  for (let size = 1; size <= maxLength; size += 1) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      values.push(tokens.slice(index, index + size).join(' '));
    }
  }
  return unique(values);
}
