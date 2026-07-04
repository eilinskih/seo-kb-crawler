import { Knex } from 'knex';

export const contentProcessingFoundationMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('documents', (table) => {
      table.uuid('id').primary();
      table.uuid('topic_id').notNullable();
      table.string('frontier_entry_id', 100).notNullable();
      table.uuid('current_version_id').nullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.unique(
        ['topic_id', 'frontier_entry_id'],
        'documents_topic_frontier_unique',
      );
      table.index(['topic_id', 'updated_at'], 'documents_topic_updated_idx');
    });

    await knex.schema.createTable('document_versions', (table) => {
      table.uuid('id').primary();
      table
        .uuid('document_id')
        .notNullable()
        .references('documents.id')
        .onDelete('CASCADE');
      table
        .string('crawl_attempt_id', 100)
        .notNullable()
        .references('crawl_attempts.attempt_id')
        .onDelete('CASCADE');
      table.uuid('topic_id').notNullable();
      table.string('frontier_entry_id', 100).notNullable();
      table.integer('topic_configuration_version').notNullable();
      table.text('requested_url').notNullable();
      table.text('final_url').nullable();
      table.text('canonical_url').nullable();
      table.text('title').nullable();
      table.text('meta_description').nullable();
      table.string('content_hash', 64).nullable();
      table.string('extractor_version', 80).notNullable();
      table.text('raw_html').nullable();
      table.text('cleaned_markdown').nullable();
      table.text('plain_text').nullable();
      table.jsonb('metadata').notNullable();
      table.jsonb('structured_data').notNullable();
      table.jsonb('language_hints').notNullable();
      table.jsonb('geo_hints').notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.unique(
        ['document_id', 'content_hash', 'extractor_version'],
        'document_versions_content_extractor_unique',
      );
      table.unique(
        ['crawl_attempt_id', 'extractor_version'],
        'document_versions_attempt_extractor_unique',
      );
      table.index(
        ['document_id', 'created_at'],
        'document_versions_document_created_idx',
      );
      table.index(
        ['topic_id', 'frontier_entry_id'],
        'document_versions_topic_frontier_idx',
      );
      table.index(
        ['content_hash'],
        'document_versions_content_hash_idx',
      );
    });

    await knex.schema.alterTable('documents', (table) => {
      table
        .foreign('current_version_id')
        .references('document_versions.id')
        .onDelete('SET NULL');
    });

    await knex.schema.createTable('content_processing_runs', (table) => {
      table
        .string('crawl_attempt_id', 100)
        .primary()
        .references('crawl_attempts.attempt_id')
        .onDelete('CASCADE');
      table.uuid('document_id').nullable().references('documents.id');
      table
        .uuid('document_version_id')
        .nullable()
        .references('document_versions.id');
      table.string('status', 40).notNullable();
      table.jsonb('failure').nullable();
      table.string('extractor_version', 80).notNullable();
      table.timestamp('started_at', { useTz: true }).nullable();
      table.timestamp('completed_at', { useTz: true }).nullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.index(
        ['status', 'updated_at'],
        'content_processing_runs_status_updated_idx',
      );
      table.index(
        ['document_id', 'updated_at'],
        'content_processing_runs_document_updated_idx',
      );
    });

    await knex.raw(`
      ALTER TABLE document_versions
      ADD CONSTRAINT document_versions_topic_configuration_version_check
      CHECK (topic_configuration_version > 0)
    `);
    await knex.raw(`
      ALTER TABLE content_processing_runs
      ADD CONSTRAINT content_processing_runs_status_check
      CHECK (
        status IN (
          'pending',
          'processing',
          'processed',
          'failed_retryable',
          'failed_terminal',
          'skipped_duplicate'
        )
      )
    `);
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('content_processing_runs');
    await knex.schema.alterTable('documents', (table) => {
      table.dropForeign(['current_version_id']);
    });
    await knex.schema.dropTableIfExists('document_versions');
    await knex.schema.dropTableIfExists('documents');
  },
};
