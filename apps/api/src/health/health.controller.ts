import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HealthResponse } from '@seo-kb/common';
import { DbService } from '@seo-kb/db';
import { InfrastructureHealthService } from './infrastructure-health.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly db: DbService,
    private readonly infrastructure: InfrastructureHealthService,
  ) {}

  @Get()
  async check(): Promise<HealthResponse> {
    const [database, redis] = await Promise.all([
      this.db.ping(),
      this.infrastructure.pingRedis(),
    ]);

    const response: HealthResponse = {
      status: database && redis ? 'ok' : 'degraded',
      service: 'api',
      timestamp: new Date().toISOString(),
      checks: {
        database,
        redis,
      },
    };

    if (response.status === 'degraded') {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }
}
