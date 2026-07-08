import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  EntityNotFoundError,
  EntityService,
  EntityValidationError,
} from '@seo-kb/entities';
import { EntitiesController } from './entities.controller';

describe('EntitiesController', () => {
  it('creates canonical entities', async () => {
    const response = { id: 'entity-1' };
    const service = {
      createEntity: jest.fn(async () => response),
    } as unknown as EntityService;
    const controller = new EntitiesController(service);

    await expect(
      controller.create({
        canonicalName: 'PostgreSQL',
        entityType: 'software',
      }),
    ).resolves.toBe(response);
    expect(service.createEntity).toHaveBeenCalledWith({
      canonicalName: 'PostgreSQL',
      entityType: 'software',
    });
  });

  it('adds aliases to a path entity id', async () => {
    const response = { id: 'alias-1' };
    const service = {
      addAlias: jest.fn(async () => response),
    } as unknown as EntityService;
    const controller = new EntitiesController(service);

    await expect(
      controller.addAlias('00000000-0000-4000-8000-000000000001', {
        aliasText: 'Postgres',
        aliasType: 'abbreviation',
      }),
    ).resolves.toBe(response);
    expect(service.addAlias).toHaveBeenCalledWith({
      entityId: '00000000-0000-4000-8000-000000000001',
      aliasText: 'Postgres',
      aliasType: 'abbreviation',
    });
  });

  it('records entity mentions', async () => {
    const response = { id: 'mention-1' };
    const service = {
      recordMention: jest.fn(async () => response),
    } as unknown as EntityService;
    const controller = new EntitiesController(service);

    await expect(
      controller.recordMention({
        entityId: '00000000-0000-4000-8000-000000000001',
        chunkId: '00000000-0000-4000-8000-000000000002',
        mentionText: 'Postgres',
      }),
    ).resolves.toBe(response);
  });

  it('maps missing entities to not found', async () => {
    const service = {
      addAlias: jest.fn(async () => {
        throw new EntityNotFoundError('entity-1');
      }),
    } as unknown as EntityService;
    const controller = new EntitiesController(service);

    await expect(
      controller.addAlias('00000000-0000-4000-8000-000000000001', {
        aliasText: 'Postgres',
        aliasType: 'abbreviation',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps entity validation errors to bad requests', async () => {
    const service = {
      createEntity: jest.fn(async () => {
        throw new EntityValidationError('canonicalName is required');
      }),
    } as unknown as EntityService;
    const controller = new EntitiesController(service);

    await expect(
      controller.create({
        canonicalName: '',
        entityType: 'software',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
