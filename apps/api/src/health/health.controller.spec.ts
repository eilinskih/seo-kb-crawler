import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DbService } from '@seo-kb/db';
import { HealthController } from './health.controller';
import { InfrastructureHealthService } from './infrastructure-health.service';

describe('HealthController', () => {
  const db = { ping: jest.fn() };
  const infrastructure = { pingRedis: jest.fn() };
  let controller: HealthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: DbService, useValue: db },
        { provide: InfrastructureHealthService, useValue: infrastructure },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('reports healthy when PostgreSQL and Redis respond', async () => {
    db.ping.mockResolvedValue(true);
    infrastructure.pingRedis.mockResolvedValue(true);

    await expect(controller.check()).resolves.toMatchObject({
      status: 'ok',
      service: 'api',
      checks: {
        database: true,
        redis: true,
      },
    });
  });

  it('returns a service unavailable error when a dependency is down', async () => {
    db.ping.mockResolvedValue(false);
    infrastructure.pingRedis.mockResolvedValue(true);

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
