import { Knex } from 'knex';

export const urlFrontierSchedulingStateMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('url_frontier_entries', (table) => {
      table.float('freshness_score').notNullable().defaultTo(1);
      table.string('recrawl_reason', 80).notNullable().defaultTo('initial_discovery');
    });

    await knex.raw(`
      ALTER TABLE url_frontier_entries
      ADD CONSTRAINT url_frontier_entries_freshness_score_check
      CHECK (freshness_score >= 0 AND freshness_score <= 1)
    `);
    await knex.raw(`
      ALTER TABLE url_frontier_entries
      ADD CONSTRAINT url_frontier_entries_recrawl_reason_check
      CHECK (
        recrawl_reason IN (
          'initial_discovery',
          'retry_backoff',
          'success_recrawl',
          'manual_dispatch',
          'policy_changed',
          'rediscovered',
          'canonical_suppression'
        )
      )
    `);
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('url_frontier_entries', (table) => {
      table.dropColumn('recrawl_reason');
      table.dropColumn('freshness_score');
    });
  },
};
