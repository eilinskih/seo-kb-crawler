import { externalSeoProviderPersistenceMigration } from './026-external-seo-provider-persistence';

describe('externalSeoProviderPersistenceMigration', () => {
  it('creates provider-neutral pack, observation and metric snapshot storage', async () => {
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

    await externalSeoProviderPersistenceMigration.up(knex as never);

    expect(tables.get('external_seo_enrichment_packs')?.columns).toEqual(
      expect.arrayContaining([
        'id',
        'topic_id',
        'query',
        'provider_statuses',
        'warnings',
        'pack',
        'degraded',
        'generated_at',
        'created_at',
      ]),
    );
    expect(tables.get('external_seo_observations')?.columns).toEqual(
      expect.arrayContaining([
        'id',
        'pack_id',
        'provider_key',
        'observation_type',
        'source_capability',
        'subject',
        'observation',
        'observed_at',
      ]),
    );
    expect(tables.get('external_seo_metric_snapshots')?.columns).toEqual(
      expect.arrayContaining([
        'id',
        'pack_id',
        'provider_key',
        'metric_name',
        'source_capability',
        'value',
        'snapshot',
        'fetched_at',
      ]),
    );
    expect(tables.get('external_seo_metric_snapshots')?.indexes).toContainEqual([
      'metric_name',
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
}
