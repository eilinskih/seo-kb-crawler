import { Knex } from 'knex';

export const urlFrontierCrawlAttemptsMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('crawl_attempts', (table) => {
      table.string('attempt_id', 100).primary();
      table.string('frontier_entry_id', 100).notNullable();
      table.string('topic_id', 100).notNullable();
      table.integer('topic_configuration_version').notNullable();
      table.text('requested_url').notNullable();
      table.string('status', 40).notNullable();
      table.text('final_url').nullable();
      table.integer('status_code').nullable();
      table.jsonb('headers').notNullable();
      table.jsonb('redirect_chain').notNullable();
      table.text('canonical_url').nullable();
      table.text('title').nullable();
      table.text('meta_description').nullable();
      table.text('raw_html').nullable();
      table.text('cleaned_markdown').nullable();
      table.text('plain_text').nullable();
      table.string('content_hash', 64).nullable();
      table.jsonb('outgoing_links').notNullable();
      table.jsonb('media_assets').notNullable();
      table.jsonb('timing').notNullable();
      table.string('adapter_key', 80).notNullable();
      table.string('adapter_version', 80).notNullable();
      table.jsonb('failure').nullable();
      table.timestamp('recorded_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.index(
        ['frontier_entry_id', 'recorded_at'],
        'crawl_attempts_frontier_recorded_idx',
      );
      table.index(['topic_id', 'status'], 'crawl_attempts_topic_status_idx');
      table.index(['content_hash'], 'crawl_attempts_content_hash_idx');
    });

    await knex.raw(`
      ALTER TABLE crawl_attempts
      ADD CONSTRAINT crawl_attempts_status_check
      CHECK (
        status IN (
          'running',
          'succeeded',
          'failed_retryable',
          'failed_terminal',
          'timed_out',
          'blocked_by_policy',
          'cancelled'
        )
      )
    `);
    await knex.raw(`
      ALTER TABLE crawl_attempts
      ADD CONSTRAINT crawl_attempts_topic_configuration_version_check
      CHECK (topic_configuration_version > 0)
    `);
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('crawl_attempts');
  },
};
