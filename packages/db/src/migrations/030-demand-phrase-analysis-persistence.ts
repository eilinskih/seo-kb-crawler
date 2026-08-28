import { Knex } from 'knex';

export const demandPhraseAnalysisPersistenceMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('demand_keyword_candidates', (table) => {
      table.jsonb('phrase_analysis').nullable();
      table.timestamp('phrase_analysis_updated_at', { useTz: true }).nullable();
      table
        .uuid('phrase_analysis_attempt_id')
        .nullable()
        .references('entity_enrichment_attempts.id')
        .onDelete('SET NULL');

      table.index(
        ['phrase_analysis_attempt_id'],
        'demand_keyword_candidates_phrase_analysis_attempt_idx',
      );
    });

    await knex.schema.alterTable('demand_candidate_pages', (table) => {
      table.jsonb('phrase_analysis').nullable();
      table.timestamp('phrase_analysis_updated_at', { useTz: true }).nullable();
      table
        .uuid('phrase_analysis_attempt_id')
        .nullable()
        .references('entity_enrichment_attempts.id')
        .onDelete('SET NULL');

      table.index(
        ['phrase_analysis_attempt_id'],
        'demand_candidate_pages_phrase_analysis_attempt_idx',
      );
    });
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('demand_candidate_pages', (table) => {
      table.dropIndex(
        ['phrase_analysis_attempt_id'],
        'demand_candidate_pages_phrase_analysis_attempt_idx',
      );
      table.dropColumn('phrase_analysis_attempt_id');
      table.dropColumn('phrase_analysis_updated_at');
      table.dropColumn('phrase_analysis');
    });

    await knex.schema.alterTable('demand_keyword_candidates', (table) => {
      table.dropIndex(
        ['phrase_analysis_attempt_id'],
        'demand_keyword_candidates_phrase_analysis_attempt_idx',
      );
      table.dropColumn('phrase_analysis_attempt_id');
      table.dropColumn('phrase_analysis_updated_at');
      table.dropColumn('phrase_analysis');
    });
  },
};
