import { serpIntentPersistenceMigration } from './020-serp-intent-persistence';

describe('serpIntentPersistenceMigration', () => {
  it('creates SERP Intent Pack storage with reusable context keys', async () => {
    const tables = new Map<string, FakeTable>();
    const knex = {
      schema: {
        createTable: jest.fn(async (name: string, build: (table: FakeTable) => void) => {
          const table = new FakeTable();
          tables.set(name, table);
          build(table);
        }),
      },
    };

    await serpIntentPersistenceMigration.up(knex as never);

    expect(tables.get('serp_intent_packs')?.columns).toEqual(
      expect.arrayContaining([
        'id',
        'topic_key',
        'normalized_query',
        'language_key',
        'geo_key',
        'source_snapshot_ids',
        'pack',
        'created_at',
      ]),
    );
    expect(tables.get('serp_intent_packs')?.indexes).toContainEqual([
      'topic_key',
      'normalized_query',
      'language_key',
      'geo_key',
      'created_at',
    ]);
  });
});

class FakeTable {
  readonly columns: string[] = [];
  readonly indexes: string[][] = [];

  uuid(name: string): FakeColumn {
    return this.column(name);
  }

  string(name: string): FakeColumn {
    return this.column(name);
  }

  jsonb(name: string): FakeColumn {
    return this.column(name);
  }

  timestamp(name: string): FakeColumn {
    return this.column(name);
  }

  boolean(name: string): FakeColumn {
    return this.column(name);
  }

  index(columns: string[]): void {
    this.indexes.push(columns);
  }

  private column(name: string): FakeColumn {
    this.columns.push(name);
    return new FakeColumn();
  }
}

class FakeColumn {
  primary(): this {
    return this;
  }

  nullable(): this {
    return this;
  }

  notNullable(): this {
    return this;
  }

  defaultTo(): this {
    return this;
  }
}
