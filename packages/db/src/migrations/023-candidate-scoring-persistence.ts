import { Knex } from 'knex';

export const candidateScoringPersistenceMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('candidate_scoring_packs', (table) => {
      table.uuid('id').primary();
      table.uuid('topic_id').notNullable();
      table.string('profile', 80).notNullable();
      table.string('language', 40).nullable();
      table.string('language_key', 40).notNullable();
      table.jsonb('geo').notNullable().defaultTo('{}');
      table.string('geo_key', 500).notNullable();
      table.jsonb('scored_candidates').notNullable();
      table.jsonb('pack').notNullable();
      table.boolean('degraded').notNullable();
      table.jsonb('warnings').notNullable();
      table.string('rule_version', 80).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(['topic_id', 'created_at'], 'candidate_scoring_packs_topic_created_idx');
      table.index(
        ['topic_id', 'profile', 'language_key', 'geo_key', 'created_at'],
        'candidate_scoring_packs_context_created_idx',
      );
    });
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('candidate_scoring_packs');
  },
};
