import { Knex } from 'knex';

export const urlFrontierEntriesMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('url_frontier_entries', (table) => {
      table.uuid('id').primary();
      table
        .uuid('topic_id')
        .notNullable()
        .references('topics.id')
        .onDelete('CASCADE');
      table.integer('topic_configuration_version').notNullable();
      table.text('normalized_url').notNullable();
      table.string('normalized_url_hash', 64).notNullable();
      table.string('crawl_policy_fingerprint', 200).notNullable();
      table.jsonb('crawl_policy').notNullable();
      table.float('priority_score').notNullable();
      table.float('relevance_score').nullable();
      table.string('relevance_decision', 40).notNullable();
      table.jsonb('relevance_explanation').nullable();
      table.integer('relevance_profile_version').nullable();
      table.string('crawl_status', 40).notNullable();
      table.timestamp('next_crawl_at', { useTz: true }).notNullable();
      table.string('lease_owner', 120).nullable();
      table.timestamp('lease_expires_at', { useTz: true }).nullable();
      table.string('active_attempt_id', 100).nullable();
      table.timestamp('last_crawled_at', { useTz: true }).nullable();
      table.integer('consecutive_failures').notNullable().defaultTo(0);
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.unique(
        ['topic_id', 'normalized_url_hash'],
        'url_frontier_entries_topic_url_hash_unique',
      );
      table.index(
        ['crawl_status', 'next_crawl_at', 'priority_score'],
        'url_frontier_entries_eligible_idx',
      );
      table.index(
        ['lease_expires_at'],
        'url_frontier_entries_lease_expiry_idx',
      );
    });

    await knex.raw(`
      ALTER TABLE url_frontier_entries
      ADD CONSTRAINT url_frontier_entries_crawl_status_check
      CHECK (
        crawl_status IN (
          'idle',
          'scheduled',
          'leased',
          'crawling',
          'succeeded',
          'failed_retryable',
          'failed_terminal'
        )
      )
    `);
    await knex.raw(`
      ALTER TABLE url_frontier_entries
      ADD CONSTRAINT url_frontier_entries_relevance_decision_check
      CHECK (
        relevance_decision IN (
          'accepted',
          'rejected',
          'insufficient_evidence'
        )
      )
    `);
    await knex.raw(`
      ALTER TABLE url_frontier_entries
      ADD CONSTRAINT url_frontier_entries_topic_configuration_version_check
      CHECK (topic_configuration_version > 0)
    `);
    await knex.raw(`
      ALTER TABLE url_frontier_entries
      ADD CONSTRAINT url_frontier_entries_consecutive_failures_check
      CHECK (consecutive_failures >= 0)
    `);
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('url_frontier_entries');
  },
};
