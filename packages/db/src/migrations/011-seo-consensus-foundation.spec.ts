import { seoConsensusFoundationMigration } from './011-seo-consensus-foundation';

describe('seoConsensusFoundationMigration', () => {
  it('creates DDL status checks without bind placeholders', async () => {
    const raw = jest.fn();
    const knex = {
      raw,
      schema: {
        createTable: jest.fn(async (_name: string, build: (table: FakeTable) => void) => {
          build(new FakeTable());
        }),
      },
    };

    await seoConsensusFoundationMigration.up(knex as never);

    expect(raw).toHaveBeenCalledWith(expect.stringContaining(
      "CHECK (status IN ('active', 'superseded'))",
    ));
    expect(raw).toHaveBeenCalledWith(expect.stringContaining(
      "CHECK (status IN ('active', 'resolved', 'deprecated'))",
    ));
    expect(raw).not.toHaveBeenCalledWith(
      expect.stringContaining('CHECK (status IN (?, ?)'),
      expect.anything(),
    );
  });
});

class FakeTable {
  uuid(): FakeColumn {
    return new FakeColumn();
  }

  string(): FakeColumn {
    return new FakeColumn();
  }

  jsonb(): FakeColumn {
    return new FakeColumn();
  }

  text(): FakeColumn {
    return new FakeColumn();
  }

  timestamp(): FakeColumn {
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
