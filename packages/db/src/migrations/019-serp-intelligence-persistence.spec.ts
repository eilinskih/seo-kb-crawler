import { serpIntelligencePersistenceMigration } from './019-serp-intelligence-persistence';

describe('serpIntelligencePersistenceMigration', () => {
  it('creates durable SERP snapshot and pack tables with reusable context keys', async () => {
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

    await serpIntelligencePersistenceMigration.up(knex as never);

    expect(tables.get('serp_snapshots')?.columns).toEqual(
      expect.arrayContaining([
        'id',
        'topic_key',
        'normalized_query',
        'language_key',
        'geo_key',
        'snapshot',
      ]),
    );
    expect(tables.get('serp_packs')?.columns).toEqual(
      expect.arrayContaining([
        'id',
        'topic_key',
        'normalized_query',
        'language_key',
        'geo_key',
        'pack',
        'created_at',
      ]),
    );
    expect(tables.get('serp_packs')?.indexes).toContainEqual([
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

  string(name: string): FakeColumn {
    return this.column(name);
  }

  uuid(name: string): FakeColumn {
    return this.column(name);
  }

  text(name: string): FakeColumn {
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
