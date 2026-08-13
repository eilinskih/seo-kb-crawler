import { embeddingFoundationMigration } from './006-embedding-foundation';

describe('embeddingFoundationMigration', () => {
  it('does not create an ANN vector index for dimensionless vectors', async () => {
    const raw = jest.fn();
    const knex = {
      raw,
      schema: {
        createTable: jest.fn(async (_name: string, build: (table: FakeTable) => void) => {
          build(new FakeTable());
        }),
      },
    };

    await embeddingFoundationMigration.up(knex as never);

    expect(raw).toHaveBeenCalledWith('CREATE EXTENSION IF NOT EXISTS vector');
    expect(raw).not.toHaveBeenCalledWith(expect.stringContaining('USING hnsw'));
  });
});

class FakeTable {
  uuid(): FakeColumn {
    return new FakeColumn();
  }

  string(): FakeColumn {
    return new FakeColumn();
  }

  integer(): FakeColumn {
    return new FakeColumn();
  }

  timestamp(): FakeColumn {
    return new FakeColumn();
  }

  jsonb(): FakeColumn {
    return new FakeColumn();
  }

  specificType(): FakeColumn {
    return new FakeColumn();
  }

  unique(): void {}

  index(): void {}
}

class FakeColumn {
  primary(): this {
    return this;
  }

  notNullable(): this {
    return this;
  }

  nullable(): this {
    return this;
  }

  references(): this {
    return this;
  }

  onDelete(): this {
    return this;
  }
}
