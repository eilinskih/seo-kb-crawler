import { Knex } from 'knex';

export const seoPackPersistenceMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('seo_packs', (table) => {
      table.uuid('id').primary();
      table.uuid('topic_id').notNullable();
      table.string('candidate_key', 500).notNullable();
      table.string('pack_key', 500).notNullable();
      table.string('page_type', 80).notNullable();
      table.string('language', 40).nullable();
      table.string('language_key', 40).notNullable();
      table.jsonb('geo').notNullable().defaultTo('{}');
      table.string('geo_key', 500).notNullable();
      table.jsonb('source_pack_references').notNullable();
      table.jsonb('uncertainty').notNullable();
      table.jsonb('pack').notNullable();
      table.boolean('degraded').notNullable();
      table.jsonb('warnings').notNullable();
      table.string('rule_version', 80).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(['topic_id', 'candidate_key', 'created_at'], 'seo_packs_candidate_created_idx');
      table.index(
        ['topic_id', 'page_type', 'language_key', 'geo_key', 'created_at'],
        'seo_packs_context_created_idx',
      );
      table.index(['pack_key'], 'seo_packs_pack_key_idx');
    });
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('seo_packs');
  },
};
