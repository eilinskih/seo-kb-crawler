import { EntityService } from './entity.service';
import {
  EntityNotFoundError,
  EntityValidationError,
} from './domain/entity-types';
import { InMemoryEntityRepository } from './testing/in-memory-entity.repository';

describe('EntityService', () => {
  it('creates canonical entities idempotently by normalized identity', async () => {
    const repository = new InMemoryEntityRepository();
    const service = new EntityService(repository);

    const first = await service.createEntity({
      canonicalName: ' PostgreSQL ',
      entityType: 'software',
    });
    const second = await service.createEntity({
      canonicalName: 'postgresql',
      entityType: 'software',
    });

    expect(second.id).toBe(first.id);
    expect(repository.entities.size).toBe(1);
  });

  it('looks up multilingual aliases with language and geo metadata', async () => {
    const repository = new InMemoryEntityRepository();
    const service = new EntityService(repository);
    const entity = await service.createEntity({
      canonicalName: 'Frogger Jump',
      entityType: 'product',
    });
    await service.addAlias({
      entityId: entity.id,
      aliasText: 'Фроггер Джамп',
      language: 'ru',
      geo: { countryCode: 'PL' },
      aliasType: 'transliteration',
      confidence: 0.8,
    });

    await expect(
      service.lookupAliases({
        aliasText: 'Фроггер Джамп',
        language: 'ru',
        geo: { countryCode: 'PL' },
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        entityId: entity.id,
        aliasText: 'Фроггер Джамп',
        aliasType: 'transliteration',
        language: 'ru',
      }),
    ]);
  });

  it('expands queries with approved aliases and canonical names only', async () => {
    const repository = new InMemoryEntityRepository();
    const service = new EntityService(repository);
    const entity = await service.createEntity({
      canonicalName: 'BMW N47 engine',
      entityType: 'model',
      vertical: 'automotive',
    });
    await service.addAlias({
      entityId: entity.id,
      aliasText: 'N47',
      aliasType: 'abbreviation',
    });
    await service.addAlias({
      entityId: entity.id,
      aliasText: 'N47D20',
      aliasType: 'brand_model_variant',
    });
    await service.addAlias({
      entityId: entity.id,
      aliasText: 'unreviewed N47',
      aliasType: 'other',
      reviewStatus: 'suggested',
    });

    const expansion = await service.expandQuery({ query: 'N47' });

    expect(expansion.canonicalEntities).toEqual([
      expect.objectContaining({
        entityId: entity.id,
        canonicalName: 'BMW N47 engine',
      }),
    ]);
    expect(expansion.expandedTerms).toEqual([
      'BMW N47 engine',
      'N47D20',
    ]);
  });

  it('returns an empty expansion when no entity data exists', async () => {
    const service = new EntityService(new InMemoryEntityRepository());

    await expect(service.expandQuery({ query: 'unknown topic' })).resolves.toEqual({
      originalQuery: 'unknown topic',
      normalizedQuery: 'unknown topic',
      canonicalEntities: [],
      aliases: [],
      expandedTerms: [],
    });
  });

  it('finds approved entity aliases mentioned inside chunk text', async () => {
    const repository = new InMemoryEntityRepository();
    const service = new EntityService(repository);
    const entity = await service.createEntity({
      canonicalName: 'Laser hair removal',
      entityType: 'procedure',
      confidence: 0.9,
    });
    await service.addAlias({
      entityId: entity.id,
      aliasText: 'laser hair removal',
      aliasType: 'exact',
      confidence: 0.8,
    });

    const mentions = await service.findMentionsInText({
      text: 'FAQ: laser hair removal cost and aftercare',
      language: 'en',
    });

    expect(mentions).toEqual([
      expect.objectContaining({
        mentionText: 'laser hair removal',
        confidence: 0.8,
        entity: expect.objectContaining({
          entityId: entity.id,
          entityType: 'procedure',
        }),
      }),
    ]);
  });

  it('records chunk mentions without requiring exact offsets', async () => {
    const repository = new InMemoryEntityRepository();
    const service = new EntityService(repository);
    const entity = await service.createEntity({
      canonicalName: 'pgvector',
      entityType: 'technology',
    });

    const mention = await service.recordMention({
      entityId: entity.id,
      chunkId: '00000000-0000-4000-8000-000000000001',
      mentionText: 'pgvector',
      locationHint: 'heading:Extensions',
    });

    expect(mention).toEqual(expect.objectContaining({
      entityId: entity.id,
      startOffset: null,
      endOffset: null,
      locationHint: 'heading:Extensions',
    }));
    expect(repository.mentions.size).toBe(1);
  });

  it('rejects mentions whose alias belongs to a different entity', async () => {
    const repository = new InMemoryEntityRepository();
    const service = new EntityService(repository);
    const first = await service.createEntity({
      canonicalName: 'BMW N47 engine',
      entityType: 'model',
    });
    const second = await service.createEntity({
      canonicalName: 'BMW N57 engine',
      entityType: 'model',
    });
    const alias = await service.addAlias({
      entityId: second.id,
      aliasText: 'N57',
      aliasType: 'abbreviation',
    });

    await expect(
      service.recordMention({
        entityId: first.id,
        aliasId: alias.id,
        chunkId: '00000000-0000-4000-8000-000000000001',
        mentionText: 'N57',
      }),
    ).rejects.toThrow(EntityValidationError);
  });

  it('rejects aliases for missing entities', async () => {
    const service = new EntityService(new InMemoryEntityRepository());

    await expect(
      service.addAlias({
        entityId: 'missing',
        aliasText: 'N47',
        aliasType: 'abbreviation',
      }),
    ).rejects.toThrow(EntityNotFoundError);
  });
});
