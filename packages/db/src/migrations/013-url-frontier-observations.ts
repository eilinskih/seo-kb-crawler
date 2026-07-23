import { Knex } from 'knex';

export const urlFrontierObservationsMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('url_discovery_observations', (table) => {
      table.uuid('id').primary();
      table
        .uuid('frontier_entry_id')
        .nullable()
        .references('url_frontier_entries.id')
        .onDelete('CASCADE');
      table
        .uuid('topic_id')
        .notNullable()
        .references('topics.id')
        .onDelete('CASCADE');
      table.integer('topic_configuration_version').notNullable();
      table.string('discovery_run_id', 100).notNullable();
      table.string('source_type', 40).notNullable();
      table.string('source_key', 200).notNullable();
      table.text('discovered_url').notNullable();
      table.text('normalized_url').notNullable();
      table.string('normalized_url_hash', 64).notNullable();
      table.timestamp('discovered_at', { useTz: true }).notNullable();
      table.text('source_url').nullable();
      table.text('title').nullable();
      table.text('snippet').nullable();
      table.text('anchor_text').nullable();
      table.integer('source_rank').nullable();
      table.jsonb('metadata').notNullable();
      table.string('idempotency_key', 64).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.unique(
        ['idempotency_key'],
        'url_discovery_observations_idempotency_unique',
      );
      table.index(
        ['topic_id', 'normalized_url_hash'],
        'url_discovery_observations_topic_url_idx',
      );
      table.index(
        ['frontier_entry_id', 'discovered_at'],
        'url_discovery_observations_entry_discovered_idx',
      );
      table.index(
        ['source_type', 'source_key'],
        'url_discovery_observations_source_idx',
      );
    });

    await knex.raw(`
      ALTER TABLE url_discovery_observations
      ADD CONSTRAINT url_discovery_observations_source_type_check
      CHECK (
        source_type IN (
          'search',
          'sitemap',
          'seed',
          'link',
          'operator'
        )
      )
    `);
    await knex.raw(`
      ALTER TABLE url_discovery_observations
      ADD CONSTRAINT url_discovery_observations_topic_configuration_version_check
      CHECK (topic_configuration_version > 0)
    `);
    await knex.raw(`
      ALTER TABLE url_discovery_observations
      ADD CONSTRAINT url_discovery_observations_source_rank_check
      CHECK (source_rank IS NULL OR source_rank > 0)
    `);
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('url_discovery_observations');
  },
};
