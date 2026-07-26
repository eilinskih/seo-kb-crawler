import { demandEnginePersistenceMigration } from './018-demand-engine-persistence';

describe('demandEnginePersistenceMigration', () => {
  it('creates topic keys used by Demand Engine repository upserts', async () => {
    const tables = new Map<string, FakeTable>();
    const knex = {
      schema: {
        createTable: jest.fn(async (name: string, build: (table: FakeTable) => void) => {
          const table = new FakeTable();
          tables.set(name, table);
          build(table);
        }),
      },
      raw: jest.fn(async () => undefined),
    };

    await demandEnginePersistenceMigration.up(knex as never);

    expect(tables.get('demand_observations')?.columns).toContain('topic_key');
    expect(tables.get('demand_candidate_pages')?.columns).toContain('topic_key');
    expect(tables.get('demand_candidate_pages')?.uniqueConstraints).toContainEqual(
      ['topic_key', 'slug'],
    );
  });
});

class FakeTable {
  readonly columns: string[] = [];
  readonly uniqueConstraints: string[][] = [];

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

  integer(name: string): FakeColumn {
    return this.column(name);
  }

  decimal(name: string): FakeColumn {
    return this.column(name);
  }

  timestamp(name: string): FakeColumn {
    return this.column(name);
  }

  unique(columns: string[]): void {
    this.uniqueConstraints.push(columns);
  }

  index(): void {
    return undefined;
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

  references(): this {
    return this;
  }

  onDelete(): this {
    return this;
  }

  defaultTo(): this {
    return this;
  }
}
