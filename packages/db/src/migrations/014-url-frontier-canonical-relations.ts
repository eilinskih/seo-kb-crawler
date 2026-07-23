import { Knex } from 'knex';

export const urlFrontierCanonicalRelationsMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('url_frontier_entries', (table) => {
      table.text('canonical_url').nullable();
      table.string('canonical_source', 40).nullable();
      table.string('suppression_reason', 80).nullable();
    });

    await knex.schema.createTable('url_canonical_relations', (table) => {
      table.uuid('id').primary();
      table
        .uuid('topic_id')
        .notNullable()
        .references('topics.id')
        .onDelete('CASCADE');
      table
        .uuid('source_frontier_entry_id')
        .notNullable()
        .references('url_frontier_entries.id')
        .onDelete('CASCADE');
      table
        .uuid('target_frontier_entry_id')
        .nullable()
        .references('url_frontier_entries.id')
        .onDelete('SET NULL');
      table.text('source_normalized_url').notNullable();
      table.text('target_normalized_url').notNullable();
      table.string('target_normalized_url_hash', 64).notNullable();
      table.string('evidence_type', 40).notNullable();
      table.jsonb('evidence').notNullable();
      table.boolean('accepted').notNullable();
      table.string('rejection_reason', 120).nullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.unique(
        ['source_frontier_entry_id', 'target_normalized_url_hash', 'evidence_type'],
        'url_canonical_relations_source_target_evidence_unique',
      );
      table.index(['topic_id'], 'url_canonical_relations_topic_idx');
      table.index(
        ['target_frontier_entry_id'],
        'url_canonical_relations_target_idx',
      );
    });

    await knex.raw(`
      ALTER TABLE url_frontier_entries
      ADD CONSTRAINT url_frontier_entries_canonical_source_check
      CHECK (
        canonical_source IS NULL OR canonical_source IN (
          'operator',
          'redirect',
          'http_link',
          'html_link'
        )
      )
    `);
    await knex.raw(`
      ALTER TABLE url_canonical_relations
      ADD CONSTRAINT url_canonical_relations_evidence_type_check
      CHECK (
        evidence_type IN (
          'operator',
          'redirect',
          'http_link',
          'html_link'
        )
      )
    `);
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('url_canonical_relations');
    await knex.schema.alterTable('url_frontier_entries', (table) => {
      table.dropColumn('suppression_reason');
      table.dropColumn('canonical_source');
      table.dropColumn('canonical_url');
    });
  },
};
