import { entityAliasReviewAuditMigration } from './027-entity-alias-review-audit';

describe('entityAliasReviewAuditMigration', () => {
  it('adds alias review audit columns', async () => {
    const tables = new Map<string, FakeTable>();
    const knex = {
      schema: {
        alterTable: jest.fn(async (name: string, build: (table: FakeTable) => void) => {
          const table = new FakeTable();
          tables.set(name, table);
          build(table);
        }),
      },
    };

    await entityAliasReviewAuditMigration.up(knex as never);

    expect(tables.get('entity_aliases')?.columns).toEqual([
      'reviewed_at',
      'reviewed_by',
      'review_note',
    ]);
  });
});

class FakeTable {
  readonly columns: string[] = [];

  timestamp(name: string): FakeColumn {
    return this.column(name);
  }

  string(name: string): FakeColumn {
    return this.column(name);
  }

  text(name: string): FakeColumn {
    return this.column(name);
  }

  dropColumn(name: string): void {
    this.columns.push(`drop:${name}`);
  }

  private column(name: string): FakeColumn {
    this.columns.push(name);
    return new FakeColumn();
  }
}

class FakeColumn {
  nullable(): this {
    return this;
  }
}
