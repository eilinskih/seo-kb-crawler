import { Knex } from 'knex';

export const topicEngineMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('topics', (table) => {
      table.uuid('id').primary();
      table.string('slug', 80).notNullable().unique();
      table.string('name', 160).notNullable();
      table.text('description').nullable();
      table.string('status', 20).notNullable();
      table.integer('configuration_version').notNullable();
      table.jsonb('discovery').notNullable();
      table.jsonb('language_geo').notNullable();
      table.jsonb('crawl_policy').notNullable();
      table.jsonb('relevance_profile').notNullable();
      table.jsonb('intent_profile').nullable();
      table.string('crawl_policy_fingerprint', 64).notNullable();
      table.string('relevance_profile_fingerprint', 64).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();
      table.timestamp('activated_at', { useTz: true }).nullable();
      table.timestamp('archived_at', { useTz: true }).nullable();
      table.index(['status', 'updated_at'], 'topics_status_updated_idx');
    });

    await knex.raw(`
      ALTER TABLE topics
      ADD CONSTRAINT topics_status_check
      CHECK (status IN ('draft', 'active', 'paused', 'archived'))
    `);
    await knex.raw(`
      ALTER TABLE topics
      ADD CONSTRAINT topics_configuration_version_check
      CHECK (configuration_version > 0)
    `);

    await knex.schema.createTable('topic_configuration_snapshots', (table) => {
      table.uuid('topic_id').notNullable();
      table.integer('configuration_version').notNullable();
      table.jsonb('discovery').notNullable();
      table.jsonb('language_geo').notNullable();
      table.jsonb('crawl_policy').notNullable();
      table.jsonb('relevance_profile').notNullable();
      table.jsonb('intent_profile').nullable();
      table.string('crawl_policy_fingerprint', 64).notNullable();
      table.string('relevance_profile_fingerprint', 64).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.primary(['topic_id', 'configuration_version']);
      table
        .foreign('topic_id')
        .references('topics.id')
        .onDelete('CASCADE');
    });
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('topic_configuration_snapshots');
    await knex.schema.dropTableIfExists('topics');
  },
};
