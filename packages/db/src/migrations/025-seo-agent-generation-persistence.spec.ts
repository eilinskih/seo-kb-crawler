import { seoAgentGenerationPersistenceMigration } from './025-seo-agent-generation-persistence';

describe('seoAgentGenerationPersistenceMigration', () => {
  it('creates SEO Agent generation context and response storage', async () => {
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

    await seoAgentGenerationPersistenceMigration.up(knex as never);

    expect(tables.get('seo_agent_generation_contexts')?.columns).toEqual(
      expect.arrayContaining([
        'id',
        'gateway_request_key',
        'topic_id',
        'query',
        'objective',
        'source_pack_references',
        'context',
        'fallback_state',
        'created_at',
      ]),
    );
    expect(tables.get('seo_agent_generation_responses')?.columns).toEqual(
      expect.arrayContaining([
        'id',
        'gateway_request_key',
        'topic_id',
        'query',
        'provider_key',
        'status',
        'prompt',
        'provider_result',
        'final_content',
        'runtime_result',
        'created_at',
      ]),
    );
    expect(tables.get('seo_agent_generation_responses')?.indexes).toContainEqual([
      'provider_key',
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
