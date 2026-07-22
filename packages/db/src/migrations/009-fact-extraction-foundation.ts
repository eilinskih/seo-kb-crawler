import { Knex } from 'knex';

export const factExtractionFoundationMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('fact_extraction_runs', (table) => {
      table.uuid('id').primary();
      table.uuid('topic_id').notNullable();
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
      table
        .uuid('chunk_id')
        .notNullable()
        .references('chunks.id')
        .onDelete('CASCADE');
      table.string('chunk_content_hash', 64).notNullable();
      table.string('profile_key', 80).notNullable();
      table.string('profile_version', 80).notNullable();
      table.string('provider_key', 80).notNullable();
      table.string('model_key', 120).notNullable();
      table.string('model_version', 120).notNullable();
      table.string('status', 40).notNullable();
      table.jsonb('failure').nullable();
      table.timestamp('started_at', { useTz: true }).nullable();
      table.timestamp('completed_at', { useTz: true }).nullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.unique(
        [
          'chunk_id',
          'document_version_id',
          'profile_key',
          'profile_version',
          'provider_key',
          'model_key',
          'model_version',
          'chunk_content_hash',
        ],
        'fact_extraction_runs_identity_unique',
      );
      table.index(['status', 'updated_at'], 'fact_extraction_runs_status_idx');
      table.index(['topic_id', 'status'], 'fact_extraction_runs_topic_idx');
    });

    await knex.schema.alterTable('raw_facts', (table) => {
      table
        .uuid('extraction_run_id')
        .nullable()
        .references('fact_extraction_runs.id')
        .onDelete('SET NULL');
      table
        .uuid('source_document_version_id')
        .nullable()
        .references('document_versions.id')
        .onDelete('SET NULL');
      table.jsonb('field_confidence').nullable();
      table.text('evidence_text').nullable();

      table.index(['extraction_run_id'], 'raw_facts_extraction_run_idx');
      table.index(
        ['source_document_version_id'],
        'raw_facts_source_document_version_idx',
      );
    });

    await knex.schema.alterTable('canonical_facts', (table) => {
      table
        .uuid('source_document_version_id')
        .nullable()
        .references('document_versions.id')
        .onDelete('SET NULL');

      table.index(
        ['source_document_version_id'],
        'canonical_facts_source_document_version_idx',
      );
    });

    await knex.schema.createTable('fact_normalization_attempts', (table) => {
      table.uuid('id').primary();
      table
        .uuid('raw_fact_id')
        .nullable()
        .references('raw_facts.id')
        .onDelete('CASCADE');
      table
        .uuid('extraction_run_id')
        .notNullable()
        .references('fact_extraction_runs.id')
        .onDelete('CASCADE');
      table.string('predicate_resolution_status', 40).notNullable();
      table
        .uuid('predicate_id')
        .nullable()
        .references('ontology_predicates.id')
        .onDelete('SET NULL');
      table
        .uuid('predicate_alias_id')
        .nullable()
        .references('ontology_predicate_aliases.id')
        .onDelete('SET NULL');
      table
        .uuid('canonical_fact_id')
        .nullable()
        .references('canonical_facts.id')
        .onDelete('SET NULL');
      table.text('rejection_reason').nullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(
        ['extraction_run_id'],
        'fact_normalization_attempts_run_idx',
      );
      table.index(
        ['predicate_resolution_status'],
        'fact_normalization_attempts_status_idx',
      );
    });

    await knex.raw(`
      ALTER TABLE fact_extraction_runs
      ADD CONSTRAINT fact_extraction_runs_status_check
      CHECK (
        status IN (
          'pending',
          'extracting',
          'completed',
          'skipped',
          'failed_retryable',
          'failed_terminal'
        )
      )
    `);
    await knex.raw(`
      ALTER TABLE fact_normalization_attempts
      ADD CONSTRAINT fact_normalization_attempts_status_check
      CHECK (
        predicate_resolution_status IN (
          'resolved',
          'pending_review',
          'deprecated',
          'not_found',
          'ambiguous'
        )
      )
    `);
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('fact_normalization_attempts');
    await knex.schema.alterTable('canonical_facts', (table) => {
      table.dropIndex(
        ['source_document_version_id'],
        'canonical_facts_source_document_version_idx',
      );
      table.dropColumn('source_document_version_id');
    });
    await knex.schema.alterTable('raw_facts', (table) => {
      table.dropIndex(
        ['source_document_version_id'],
        'raw_facts_source_document_version_idx',
      );
      table.dropIndex(['extraction_run_id'], 'raw_facts_extraction_run_idx');
      table.dropColumn('evidence_text');
      table.dropColumn('field_confidence');
      table.dropColumn('source_document_version_id');
      table.dropColumn('extraction_run_id');
    });
    await knex.schema.dropTableIfExists('fact_extraction_runs');
  },
};
