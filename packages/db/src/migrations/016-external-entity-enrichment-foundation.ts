import { Knex } from 'knex';

export const externalEntityEnrichmentFoundationMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('external_entity_sources', (table) => {
      table.string('provider_key', 120).primary();
      table.string('tier', 40).notNullable();
      table.jsonb('capabilities').notNullable();
      table.string('status', 40).notNullable();
      table.jsonb('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();
    });

    await knex.schema.createTable('entity_enrichment_attempts', (table) => {
      table.uuid('id').primary();
      table
        .uuid('entity_id')
        .nullable()
        .references('entities.id')
        .onDelete('SET NULL');
      table.string('entity_name', 500).notNullable();
      table.string('entity_type', 120).nullable();
      table.string('vertical', 120).nullable();
      table.string('language', 40).nullable();
      table.jsonb('geo').notNullable().defaultTo('{}');
      table.string('status', 40).notNullable();
      table.boolean('degraded').notNullable();
      table.jsonb('request').notNullable();
      table.jsonb('provider_statuses').notNullable();
      table.jsonb('warnings').notNullable();
      table.jsonb('candidates').notNullable();
      table.timestamp('started_at', { useTz: true }).notNullable();
      table.timestamp('completed_at', { useTz: true }).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(['entity_id'], 'entity_enrichment_attempts_entity_idx');
      table.index(['entity_name'], 'entity_enrichment_attempts_name_idx');
      table.index(['created_at'], 'entity_enrichment_attempts_created_idx');
    });

    await knex.schema.createTable('entity_external_ids', (table) => {
      table.uuid('id').primary();
      table
        .uuid('entity_id')
        .nullable()
        .references('entities.id')
        .onDelete('CASCADE');
      table.string('provider_key', 120).notNullable();
      table.string('external_id', 500).notNullable();
      table.string('external_id_type', 120).notNullable();
      table.string('confidence', 40).notNullable();
      table.text('source_url').nullable();
      table
        .uuid('latest_attempt_id')
        .nullable()
        .references('entity_enrichment_attempts.id')
        .onDelete('SET NULL');
      table.jsonb('metadata').notNullable().defaultTo('{}');
      table.timestamp('observed_at', { useTz: true }).nullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.unique(
        ['provider_key', 'external_id', 'external_id_type'],
        'entity_external_ids_provider_external_unique',
      );
      table.index(['entity_id'], 'entity_external_ids_entity_idx');
      table.index(
        ['provider_key', 'external_id'],
        'entity_external_ids_provider_external_idx',
      );
    });

    await knex.raw(`
      ALTER TABLE external_entity_sources
      ADD CONSTRAINT external_entity_sources_tier_check
      CHECK (tier IN ('local_signal', 'public_provider', 'paid_provider'))
    `);
    await knex.raw(`
      ALTER TABLE external_entity_sources
      ADD CONSTRAINT external_entity_sources_status_check
      CHECK (
        status IN (
          'available',
          'disabled',
          'misconfigured',
          'rate_limited',
          'unavailable',
          'degraded'
        )
      )
    `);
    await knex.raw(`
      ALTER TABLE entity_enrichment_attempts
      ADD CONSTRAINT entity_enrichment_attempts_status_check
      CHECK (status IN ('completed', 'failed_open'))
    `);
    await knex.raw(`
      ALTER TABLE entity_external_ids
      ADD CONSTRAINT entity_external_ids_confidence_check
      CHECK (confidence IN ('unknown', 'low', 'medium', 'high'))
    `);
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('entity_external_ids');
    await knex.schema.dropTableIfExists('entity_enrichment_attempts');
    await knex.schema.dropTableIfExists('external_entity_sources');
  },
};
