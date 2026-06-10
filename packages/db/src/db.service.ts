import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import createKnex, { Knex } from 'knex';
import { topicEngineMigration } from './migrations/001-topic-engine';

@Injectable()
export class DbService implements OnModuleInit, OnApplicationShutdown {
  readonly knex: Knex;

  constructor(config: ConfigService) {
    this.knex = createKnex({
      client: 'pg',
      connection: config.getOrThrow<string>('DATABASE_URL'),
      pool: {
        min: 0,
        max: 10,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.knex.migrate.latest({
      migrationSource: new BundledMigrationSource(),
    });
  }

  async ping(): Promise<boolean> {
    try {
      await this.knex.raw('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.knex.destroy();
  }
}

class BundledMigrationSource implements Knex.MigrationSource<Knex.Migration> {
  getMigrations(): Promise<Knex.Migration[]> {
    return Promise.resolve([topicEngineMigration]);
  }

  getMigrationName(): string {
    return '001-topic-engine';
  }

  getMigration(migration: Knex.Migration): Promise<Knex.Migration> {
    return Promise.resolve(migration);
  }
}
