import { demandCandidatePageReadinessMigration } from './029-demand-candidate-page-readiness';

describe('demandCandidatePageReadinessMigration', () => {
  it('adds candidate page readiness and cluster metadata columns', async () => {
    const alterTable = jest.fn((_tableName, callback) => {
      const column: {
        notNullable: jest.Mock;
        nullable: jest.Mock;
        defaultTo: jest.Mock;
      } = {
        notNullable: jest.fn(),
        nullable: jest.fn(),
        defaultTo: jest.fn(),
      };
      column.notNullable.mockReturnValue(column);
      column.nullable.mockReturnValue(column);
      column.defaultTo.mockReturnValue(column);
      const table = {
        string: jest.fn(() => column),
        jsonb: jest.fn(() => column),
        index: jest.fn(),
        dropIndex: jest.fn(),
        dropColumn: jest.fn(),
      };
      callback(table);
      expect(table.string).toHaveBeenCalledWith('readiness', 40);
      expect(table.string).toHaveBeenCalledWith('primary_intent', 120);
      expect(table.string).toHaveBeenCalledWith('cluster_key', 240);
      expect(table.string).toHaveBeenCalledWith('cluster_label', 240);
      expect(table.jsonb).toHaveBeenCalledWith('evidence_urls');
      expect(table.jsonb).toHaveBeenCalledWith('missing_research_gaps');
    });
    const knex = {
      schema: { alterTable },
      raw: jest.fn(),
    };

    await demandCandidatePageReadinessMigration.up(knex as never);

    expect(alterTable).toHaveBeenCalledWith(
      'demand_candidate_pages',
      expect.any(Function),
    );
  });
});
