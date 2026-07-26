import { Knex } from 'knex';

export const serpIntelligencePersistenceMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('serp_snapshots', (table) => {
      table.string('id', 120).primary();
      table.uuid('topic_id').nullable();
      table.string('topic_key', 80).notNullable();
      table.text('query').notNullable();
      table.string('normalized_query', 500).notNullable();
      table.string('language', 40).nullable();
      table.string('language_key', 40).notNullable();
      table.jsonb('geo').notNullable().defaultTo('{}');
      table.string('geo_key', 500).notNullable();
      table.timestamp('captured_at', { useTz: true }).notNullable();
      table.string('provider_key', 120).notNullable();
      table.string('provider_mode', 40).notNullable();
      table.boolean('degraded').notNullable();
      table.jsonb('warnings').notNullable();
      table.jsonb('results').notNullable();
      table.jsonb('snapshot').notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.index(
        ['topic_id', 'normalized_query', 'captured_at'],
        'serp_snapshots_topic_query_captured_idx',
      );
      table.index(
        ['provider_key', 'captured_at'],
        'serp_snapshots_provider_captured_idx',
      );
    });

    await knex.schema.createTable('serp_packs', (table) => {
      table.uuid('id').primary();
      table.uuid('topic_id').nullable();
      table.string('topic_key', 80).notNullable();
      table.string('normalized_query', 500).notNullable();
      table.string('language', 40).nullable();
      table.string('language_key', 40).notNullable();
      table.jsonb('geo').notNullable().defaultTo('{}');
      table.string('geo_key', 500).notNullable();
      table.jsonb('snapshot_ids').notNullable();
      table.jsonb('pack').notNullable();
      table.boolean('degraded').notNullable();
      table.jsonb('warnings').notNullable();
      table.string('rule_version', 80).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(
        ['topic_key', 'normalized_query', 'language_key', 'geo_key', 'created_at'],
        'serp_packs_context_created_idx',
      );
      table.index(['topic_id', 'created_at'], 'serp_packs_topic_created_idx');
    });
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('serp_packs');
    await knex.schema.dropTableIfExists('serp_snapshots');
  },
};
