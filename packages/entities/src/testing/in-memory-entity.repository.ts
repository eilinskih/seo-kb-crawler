import {
  EntityAliasRecord,
  EntityMentionRecord,
  EntityRecord,
  EntityRepository,
  EntityReviewStatus,
  EntityType,
} from '../domain/entity-types';

export class InMemoryEntityRepository implements EntityRepository {
  readonly entities = new Map<string, EntityRecord>();
  readonly aliases = new Map<string, EntityAliasRecord>();
  readonly mentions = new Map<string, EntityMentionRecord>();

  async createEntity(record: EntityRecord): Promise<void> {
    this.entities.set(record.id, record);
  }

  async createAlias(record: EntityAliasRecord): Promise<void> {
    this.aliases.set(record.id, record);
  }

  async createMention(record: EntityMentionRecord): Promise<void> {
    this.mentions.set(record.id, record);
  }

  async findEntityById(id: string): Promise<EntityRecord | null> {
    return this.entities.get(id) ?? null;
  }

  async findAliasById(id: string): Promise<EntityAliasRecord | null> {
    return this.aliases.get(id) ?? null;
  }

  async findEntityByIdentity(input: {
    normalizedCanonicalName: string;
    entityType: EntityType;
    vertical: string | null;
  }): Promise<EntityRecord | null> {
    return [...this.entities.values()].find((entity) =>
      entity.normalizedCanonicalName === input.normalizedCanonicalName &&
      entity.entityType === input.entityType &&
      entity.vertical === input.vertical,
    ) ?? null;
  }

  async findAliasesByNormalizedText(input: {
    normalizedAliasText: string;
    language?: string;
    geoKey?: string | null;
    statuses: EntityReviewStatus[];
  }): Promise<EntityAliasRecord[]> {
    return [...this.aliases.values()]
      .filter((alias) =>
        alias.normalizedAliasText === input.normalizedAliasText &&
        input.statuses.includes(alias.reviewStatus) &&
        matchesOptional(alias.language, input.language) &&
        matchesOptional(alias.geoKey, input.geoKey),
      )
      .sort((a, b) => b.confidence - a.confidence);
  }

  async findAliasesByNormalizedTexts(input: {
    normalizedAliasTexts: string[];
    language?: string;
    geoKey?: string | null;
    statuses: EntityReviewStatus[];
  }): Promise<EntityAliasRecord[]> {
    return [...this.aliases.values()]
      .filter((alias) =>
        input.normalizedAliasTexts.includes(alias.normalizedAliasText) &&
        input.statuses.includes(alias.reviewStatus) &&
        matchesOptional(alias.language, input.language) &&
        matchesOptional(alias.geoKey, input.geoKey),
      )
      .sort((a, b) => b.confidence - a.confidence);
  }

  async findApprovedAliasesByEntityIds(
    entityIds: string[],
  ): Promise<EntityAliasRecord[]> {
    const entityIdSet = new Set(entityIds);
    return [...this.aliases.values()]
      .filter((alias) =>
        entityIdSet.has(alias.entityId) &&
        alias.reviewStatus === 'approved',
      )
      .sort((a, b) => a.normalizedAliasText.localeCompare(b.normalizedAliasText));
  }
}

function matchesOptional(
  stored: string | null,
  requested?: string | null,
): boolean {
  if (requested === undefined) {
    return true;
  }
  return stored === requested || stored === null;
}
