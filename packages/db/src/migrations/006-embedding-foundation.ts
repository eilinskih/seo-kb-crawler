import { Knex } from 'knex';

export const embeddingFoundationMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.raw('CREATE EXTENSION IF NOT EXISTS vector');

    await knex.schema.createTable('embedding_models', (table) => {
      table.uuid('id').primary();
      table.string('provider_key', 80).notNullable();
      table.string('model_key', 120).notNullable();
      table.string('model_version', 120).notNullable();
      table.integer('dimensions').notNullable();
      table.string('distance_metric', 40).notNullable();
      table.string('language_profile', 80).notNullable();
      table.string('status', 40).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.unique(
        ['provider_key', 'model_key', 'model_version', 'dimensions'],
        'embedding_models_identity_unique',
      );
      table.index(['status'], 'embedding_models_status_idx');
    });

    await knex.schema.createTable('embedding_runs', (table) => {
      table.uuid('id').primary();
      table
        .uuid('embedding_model_id')
        .notNullable()
        .references('embedding_models.id')
        .onDelete('CASCADE');
      table.string('status', 40).notNullable();
      table.integer('candidate_count').notNullable();
      table.integer('embedded_count').notNullable();
      table.integer('skipped_count').notNullable();
      table.integer('failed_count').notNullable();
      table.timestamp('started_at', { useTz: true }).nullable();
      table.timestamp('completed_at', { useTz: true }).nullable();
      table.jsonb('failure').nullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.index(['embedding_model_id', 'status'], 'embedding_runs_model_status_idx');
    });

    await knex.schema.createTable('chunk_embeddings', (table) => {
      table.uuid('id').primary();
      table
        .uuid('chunk_id')
        .notNullable()
        .references('chunks.id')
        .onDelete('CASCADE');
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
      table
        .uuid('embedding_model_id')
        .notNullable()
        .references('embedding_models.id')
        .onDelete('CASCADE');
      table.specificType('vector', 'vector').nullable();
      table.string('chunk_content_hash', 64).notNullable();
      table.string('chunk_normalized_text_hash', 64).notNullable();
      table.string('language', 40).nullable();
      table.jsonb('geo_hints').notNullable();
      table.string('chunk_type', 40).notNullable();
      table.string('status', 40).notNullable();
      table.jsonb('failure').nullable();
      table.timestamp('embedded_at', { useTz: true }).nullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.unique(
        ['chunk_id', 'embedding_model_id', 'chunk_content_hash'],
        'chunk_embeddings_chunk_model_hash_unique',
      );
      table.index(
        ['topic_id', 'language', 'chunk_type'],
        'chunk_embeddings_topic_language_type_idx',
      );
      table.index(
        ['embedding_model_id', 'status'],
        'chunk_embeddings_model_status_idx',
      );
    });

    await knex.raw(`
      ALTER TABLE embedding_models
      ADD CONSTRAINT embedding_models_status_check
      CHECK (status IN ('active', 'deprecated', 'retired'))
    `);
    await knex.raw(`
      ALTER TABLE embedding_models
      ADD CONSTRAINT embedding_models_dimensions_check
      CHECK (dimensions >= 0)
    `);
    await knex.raw(`
      ALTER TABLE embedding_models
      ADD CONSTRAINT embedding_models_distance_metric_check
      CHECK (distance_metric IN ('cosine', 'inner_product', 'l2'))
    `);
    await knex.raw(`
      ALTER TABLE embedding_runs
      ADD CONSTRAINT embedding_runs_status_check
      CHECK (
        status IN (
          'pending',
          'embedding',
          'embedded',
          'skipped',
          'failed_retryable',
          'failed_terminal'
        )
      )
    `);
    await knex.raw(`
      ALTER TABLE chunk_embeddings
      ADD CONSTRAINT chunk_embeddings_status_check
      CHECK (
        status IN (
          'pending',
          'embedding',
          'embedded',
          'skipped',
          'failed_retryable',
          'failed_terminal'
        )
      )
    `);
    await knex.raw(`
      CREATE INDEX chunk_embeddings_vector_cosine_idx
      ON chunk_embeddings
      USING hnsw (vector vector_cosine_ops)
      WHERE vector IS NOT NULL
    `);
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('chunk_embeddings');
    await knex.schema.dropTableIfExists('embedding_runs');
    await knex.schema.dropTableIfExists('embedding_models');
  },
};
