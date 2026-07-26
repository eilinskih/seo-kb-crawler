import { longTailDiscoveryPersistenceMigration } from './022-long-tail-discovery-persistence';

describe('longTailDiscoveryPersistenceMigration', () => {
  it('creates Long-tail Discovery Pack storage with reusable topic context keys', async () => {
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

    await longTailDiscoveryPersistenceMigration.up(knex as never);

    expect(tables.get('long_tail_discovery_packs')?.columns).toEqual(
      expect.arrayContaining([
        'id',
        'topic_id',
        'normalized_topic_label',
        'language_key',
        'geo_key',
        'source_pack_references',
        'dimensions',
        'combination_rules_applied',
        'opportunity_trees',
        'candidates',
        'pack',
        'created_at',
      ]),
    );
    expect(tables.get('long_tail_discovery_packs')?.indexes).toContainEqual([
      'topic_id',
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
