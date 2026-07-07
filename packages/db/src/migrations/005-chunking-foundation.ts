import { Knex } from 'knex';

export const chunkingFoundationMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('chunking_runs', (table) => {
      table.uuid('id').primary();
      table
        .uuid('document_id')
        .notNullable()
        .references('documents.id')
        .onDelete('CASCADE');
      table
        .uuid('document_version_id')
        .notNullable()
        .references('document_versions.id')
        .onDelete('CASCADE');
      table.uuid('topic_id').notNullable();
      table.string('status', 40).notNullable();
      table.string('chunker_version', 80).notNullable();
      table.string('chunking_profile', 40).notNullable();
      table.string('tokenizer_key', 80).notNullable();
      table.string('tokenizer_version', 80).notNullable();
      table.jsonb('failure').nullable();
      table.timestamp('started_at', { useTz: true }).nullable();
      table.timestamp('completed_at', { useTz: true }).nullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.unique(
        [
          'document_version_id',
          'chunker_version',
          'chunking_profile',
          'tokenizer_key',
          'tokenizer_version',
        ],
        'chunking_runs_version_chunker_profile_tokenizer_unique',
      );
      table.index(
        ['document_version_id'],
        'chunking_runs_document_version_idx',
      );
      table.index(['topic_id', 'status'], 'chunking_runs_topic_status_idx');
    });

    await knex.schema.createTable('chunks', (table) => {
      table.uuid('id').primary();
      table
        .uuid('chunking_run_id')
        .notNullable()
        .references('chunking_runs.id')
        .onDelete('CASCADE');
      table
        .uuid('document_id')
        .notNullable()
        .references('documents.id')
        .onDelete('CASCADE');
      table
        .uuid('document_version_id')
        .notNullable()
        .references('document_versions.id')
        .onDelete('CASCADE');
      table.uuid('topic_id').notNullable();
      table.string('frontier_entry_id', 100).notNullable();
      table.integer('chunk_index').notNullable();
      table.text('text').notNullable();
      table.text('normalized_text').notNullable();
      table.jsonb('heading_path').notNullable();
      table.text('section_title').nullable();
      table.string('chunk_type', 40).notNullable();
      table.string('chunk_type_confidence', 20).notNullable();
      table.integer('token_count').notNullable();
      table.string('language', 40).nullable();
      table.jsonb('language_hints').notNullable();
      table.jsonb('geo_hints').notNullable();
      table.jsonb('source_metadata').notNullable();
      table.string('content_hash', 64).notNullable();
      table.string('normalized_text_hash', 64).notNullable();
      table.uuid('near_duplicate_group_id').nullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.unique(
        ['chunking_run_id', 'chunk_index'],
        'chunks_run_index_unique',
      );
      table.index(['document_version_id'], 'chunks_document_version_idx');
      table.index(['topic_id', 'chunk_type'], 'chunks_topic_type_idx');
      table.index(['content_hash'], 'chunks_content_hash_idx');
      table.index(
        ['normalized_text_hash'],
        'chunks_normalized_text_hash_idx',
      );
    });

    await knex.raw(`
      ALTER TABLE chunking_runs
      ADD CONSTRAINT chunking_runs_status_check
      CHECK (
        status IN (
          'pending',
          'chunking',
          'chunked',
          'failed_retryable',
          'failed_terminal'
        )
      )
    `);
    await knex.raw(`
      ALTER TABLE chunks
      ADD CONSTRAINT chunks_chunk_index_check
      CHECK (chunk_index >= 0)
    `);
    await knex.raw(`
      ALTER TABLE chunks
      ADD CONSTRAINT chunks_token_count_check
      CHECK (token_count >= 0)
    `);
    await knex.raw(`
      ALTER TABLE chunks
      ADD CONSTRAINT chunks_chunk_type_check
      CHECK (
        chunk_type IN (
          'intro',
          'section',
          'guide',
          'review',
          'faq',
          'table',
          'list',
          'comparison',
          'local_section',
          'conclusion',
          'unknown'
        )
      )
    `);
    await knex.raw(`
      ALTER TABLE chunks
      ADD CONSTRAINT chunks_chunk_type_confidence_check
      CHECK (
        chunk_type_confidence IN (
          'high',
          'medium',
          'low',
          'unknown'
        )
      )
    `);
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('chunks');
    await knex.schema.dropTableIfExists('chunking_runs');
  },
};
