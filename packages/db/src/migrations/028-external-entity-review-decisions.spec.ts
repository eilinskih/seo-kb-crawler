import { externalEntityReviewDecisionsMigration } from './028-external-entity-review-decisions';

describe('externalEntityReviewDecisionsMigration', () => {
  it('adds external entity review decision audit storage', async () => {
    const table = new FakeTable();
    const createTable = jest.fn((
      _name: string,
      callback: (builder: FakeTable) => void,
    ) => callback(table));
    const raw = jest.fn();
    const knex = {
      schema: { createTable },
      raw,
    };

    await externalEntityReviewDecisionsMigration.up(knex as never);

    expect(createTable).toHaveBeenCalledWith(
      'external_entity_review_decisions',
      expect.any(Function),
    );
    expect(table.columns).toEqual(expect.arrayContaining([
      'id',
      'attempt_id',
      'subject_type',
      'decision',
      'reviewed_by',
      'provenance',
      'metadata',
    ]));
    expect(raw).toHaveBeenCalledWith(expect.stringContaining(
      "subject_type IN ('external_id', 'candidate')",
    ));
    expect(raw).toHaveBeenCalledWith(expect.stringContaining(
      "decision IN ('accepted', 'rejected')",
    ));
  });
});

class FakeTable {
  readonly columns: string[] = [];

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

  index(): void {}

  private column(name: string): FakeColumn {
    this.columns.push(name);
    return new FakeColumn();
  }
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

  defaultTo(): this {
    return this;
  }
}
