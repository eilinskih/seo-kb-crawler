import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import createKnex, { Knex } from 'knex';
import { topicEngineMigration } from './migrations/001-topic-engine';
import { urlFrontierCrawlAttemptsMigration } from './migrations/002-url-frontier-crawl-attempts';
import { urlFrontierEntriesMigration } from './migrations/003-url-frontier-entries';
import { contentProcessingFoundationMigration } from './migrations/004-content-processing-foundation';
import { chunkingFoundationMigration } from './migrations/005-chunking-foundation';

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
  private readonly migrations = [
    topicEngineMigration,
    urlFrontierCrawlAttemptsMigration,
    urlFrontierEntriesMigration,
    contentProcessingFoundationMigration,
    chunkingFoundationMigration,
  ];
  private readonly migrationNames = new Map<Knex.Migration, string>([
    [topicEngineMigration, '001-topic-engine'],
    [
      urlFrontierCrawlAttemptsMigration,
      '002-url-frontier-crawl-attempts',
    ],
    [urlFrontierEntriesMigration, '003-url-frontier-entries'],
    [
      contentProcessingFoundationMigration,
      '004-content-processing-foundation',
    ],
    [chunkingFoundationMigration, '005-chunking-foundation'],
  ]);

  getMigrations(): Promise<Knex.Migration[]> {
    return Promise.resolve(this.migrations);
  }

  getMigrationName(migration: Knex.Migration): string {
    const name = this.migrationNames.get(migration);
    if (!name) {
      throw new Error('Unknown bundled migration');
    }
    return name;
  }

  getMigration(migration: Knex.Migration): Promise<Knex.Migration> {
    return Promise.resolve(migration);
  }
}
