import { Knex } from 'knex';

export const externalSeoProviderPersistenceMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('external_seo_enrichment_packs', (table) => {
      table.uuid('id').primary();
      table.string('topic_id', 120).nullable();
      table.text('query').nullable();
      table.text('topic_seed').nullable();
      table.string('language', 40).nullable();
      table.jsonb('market').nullable();
      table.jsonb('provider_statuses').notNullable();
      table.jsonb('warnings').notNullable();
      table.jsonb('pack').notNullable();
      table.boolean('degraded').notNullable();
      table.timestamp('generated_at', { useTz: true }).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(
        ['topic_id', 'created_at'],
        'external_seo_packs_topic_created_idx',
      );
      table.index(
        ['query', 'created_at'],
        'external_seo_packs_query_created_idx',
      );
      table.index(
        ['degraded', 'created_at'],
        'external_seo_packs_degraded_created_idx',
      );
    });

    await knex.schema.createTable('external_seo_observations', (table) => {
      table.uuid('id').primary();
      table.uuid('pack_id').notNullable();
      table.string('provider_key', 120).notNullable();
      table.string('observation_type', 80).notNullable();
      table.string('source_capability', 120).notNullable();
      table.text('subject').notNullable();
      table.text('url').nullable();
      table.string('language', 40).nullable();
      table.jsonb('market').nullable();
      table.string('confidence', 40).notNullable();
      table.jsonb('metadata').nullable();
      table.jsonb('observation').notNullable();
      table.timestamp('observed_at', { useTz: true }).nullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(
        ['pack_id', 'provider_key'],
        'external_seo_observations_pack_provider_idx',
      );
      table.index(
        ['provider_key', 'created_at'],
        'external_seo_observations_provider_created_idx',
      );
      table.index(
        ['observation_type', 'created_at'],
        'external_seo_observations_type_created_idx',
      );
    });

    await knex.schema.createTable('external_seo_metric_snapshots', (table) => {
      table.uuid('id').primary();
      table.uuid('pack_id').notNullable();
      table.string('provider_key', 120).notNullable();
      table.string('metric_name', 120).notNullable();
      table.string('source_capability', 120).notNullable();
      table.jsonb('value').nullable();
      table.string('language', 40).nullable();
      table.jsonb('market').nullable();
      table.string('confidence', 40).notNullable();
      table.jsonb('warning_codes').notNullable();
      table.jsonb('snapshot').notNullable();
      table.timestamp('fetched_at', { useTz: true }).nullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(
        ['pack_id', 'provider_key'],
        'external_seo_metrics_pack_provider_idx',
      );
      table.index(
        ['provider_key', 'created_at'],
        'external_seo_metrics_provider_created_idx',
      );
      table.index(
        ['metric_name', 'created_at'],
        'external_seo_metrics_name_created_idx',
      );
    });
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('external_seo_metric_snapshots');
    await knex.schema.dropTableIfExists('external_seo_observations');
    await knex.schema.dropTableIfExists('external_seo_enrichment_packs');
  },
};
