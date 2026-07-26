import { candidateScoringPersistenceMigration } from './023-candidate-scoring-persistence';

describe('candidateScoringPersistenceMigration', () => {
  it('creates Candidate Scoring Pack storage with reusable scoring context keys', async () => {
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

    await candidateScoringPersistenceMigration.up(knex as never);

    expect(tables.get('candidate_scoring_packs')?.columns).toEqual(
      expect.arrayContaining([
        'id',
        'topic_id',
        'profile',
        'language_key',
        'geo_key',
        'scored_candidates',
        'pack',
        'created_at',
      ]),
    );
    expect(tables.get('candidate_scoring_packs')?.indexes).toContainEqual([
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
