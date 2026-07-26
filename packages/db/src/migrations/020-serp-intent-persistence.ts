import { Knex } from 'knex';

export const serpIntentPersistenceMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('serp_intent_packs', (table) => {
      table.uuid('id').primary();
      table.uuid('topic_id').nullable();
      table.string('topic_key', 80).notNullable();
      table.string('normalized_query', 500).notNullable();
      table.string('language', 40).nullable();
      table.string('language_key', 40).notNullable();
      table.jsonb('geo').notNullable().defaultTo('{}');
      table.string('geo_key', 500).notNullable();
      table.jsonb('source_snapshot_ids').notNullable();
      table.jsonb('pack').notNullable();
      table.boolean('degraded').notNullable();
      table.jsonb('warnings').notNullable();
      table.string('rule_version', 80).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(
        ['topic_key', 'normalized_query', 'language_key', 'geo_key', 'created_at'],
        'serp_intent_packs_context_created_idx',
      );
      table.index(['topic_id', 'created_at'], 'serp_intent_packs_topic_created_idx');
    });
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('serp_intent_packs');
  },
};
