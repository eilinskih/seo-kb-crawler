import { Knex } from 'knex';

export const topicExpansionPersistenceMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('topic_expansion_packs', (table) => {
      table.uuid('id').primary();
      table.uuid('topic_id').notNullable();
      table.string('normalized_topic_label', 500).notNullable();
      table.string('language', 40).nullable();
      table.string('language_key', 40).notNullable();
      table.jsonb('geo').notNullable().defaultTo('{}');
      table.string('geo_key', 500).notNullable();
      table.jsonb('source_pack_references').notNullable();
      table.jsonb('clusters').notNullable();
      table.jsonb('candidates').notNullable();
      table.jsonb('pack').notNullable();
      table.boolean('degraded').notNullable();
      table.jsonb('warnings').notNullable();
      table.string('rule_version', 80).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(['topic_id', 'created_at'], 'topic_expansion_packs_topic_created_idx');
      table.index(
        ['topic_id', 'language_key', 'geo_key', 'created_at'],
        'topic_expansion_packs_context_created_idx',
      );
    });
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('topic_expansion_packs');
  },
};
