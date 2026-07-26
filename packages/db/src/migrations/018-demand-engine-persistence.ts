import { Knex } from 'knex';

export const demandEnginePersistenceMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('demand_keyword_candidates', (table) => {
      table.uuid('id').primary();
      table.uuid('topic_id').nullable();
      table.string('topic_key', 80).notNullable();
      table.string('normalized_keyword', 500).notNullable();
      table.string('language', 40).nullable();
      table.string('language_key', 40).notNullable();
      table.jsonb('geo').notNullable().defaultTo('{}');
      table.string('geo_key', 500).notNullable();
      table.jsonb('observed_texts').notNullable();
      table.jsonb('source_tiers').notNullable();
      table.jsonb('providers').notNullable();
      table.jsonb('evidence_types').notNullable();
      table.string('confidence', 40).notNullable();
      table.jsonb('metrics').notNullable();
      table.timestamp('last_observed_at', { useTz: true }).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.unique(
        ['topic_key', 'normalized_keyword', 'language_key', 'geo_key'],
        'demand_keyword_candidates_topic_key_keyword_lang_geo_unique',
      );
      table.index(
        ['topic_id', 'updated_at'],
        'demand_keyword_candidates_topic_updated_idx',
      );
      table.index(
        ['normalized_keyword'],
        'demand_keyword_candidates_keyword_idx',
      );
    });

    await knex.schema.createTable('demand_observations', (table) => {
      table.uuid('id').primary();
      table
        .uuid('keyword_candidate_id')
        .notNullable()
        .references('demand_keyword_candidates.id')
        .onDelete('CASCADE');
      table.uuid('topic_id').nullable();
      table.string('topic_key', 80).notNullable();
      table.text('observed_text').notNullable();
      table.string('source_tier', 40).notNullable();
      table.string('provider_key', 120).notNullable();
      table.string('evidence_type', 120).notNullable();
      table.text('source_query').notNullable();
      table.text('evidence_url').nullable();
      table.jsonb('metrics').notNullable().defaultTo('{}');
      table.timestamp('observed_at', { useTz: true }).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(
        ['keyword_candidate_id', 'observed_at'],
        'demand_observations_candidate_observed_idx',
      );
      table.index(['provider_key', 'observed_at'], 'demand_observations_provider_idx');
    });

    await knex.schema.createTable('demand_metric_snapshots', (table) => {
      table.uuid('id').primary();
      table
        .uuid('keyword_candidate_id')
        .notNullable()
        .references('demand_keyword_candidates.id')
        .onDelete('CASCADE');
      table.uuid('topic_id').nullable();
      table.integer('search_volume').nullable();
      table.integer('keyword_difficulty').nullable();
      table.decimal('cpc', 12, 4).nullable();
      table.integer('traffic_potential').nullable();
      table.decimal('trend', 12, 4).nullable();
      table.string('seasonality', 120).nullable();
      table.string('metric_status', 40).notNullable();
      table.string('provider_key', 120).nullable();
      table.timestamp('collected_at', { useTz: true }).nullable();
      table.jsonb('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(
        ['keyword_candidate_id', 'created_at'],
        'demand_metric_snapshots_candidate_created_idx',
      );
      table.index(
        ['provider_key', 'created_at'],
        'demand_metric_snapshots_provider_created_idx',
      );
    });

    await knex.schema.createTable('demand_candidate_pages', (table) => {
      table.uuid('id').primary();
      table
        .uuid('keyword_candidate_id')
        .notNullable()
        .references('demand_keyword_candidates.id')
        .onDelete('CASCADE');
      table.uuid('topic_id').nullable();
      table.string('slug', 500).notNullable();
      table.string('primary_keyword', 500).notNullable();
      table.jsonb('supporting_keywords').notNullable();
      table.string('proposed_page_type', 80).notNullable();
      table.string('confidence', 40).notNullable();
      table.jsonb('evidence_types').notNullable();
      table.jsonb('metrics').notNullable();
      table.jsonb('missing_metrics').notNullable();
      table.string('page_action', 40).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.unique(
        ['topic_key', 'slug'],
        'demand_candidate_pages_topic_key_slug_unique',
      );
      table.index(['topic_id', 'updated_at'], 'demand_candidate_pages_topic_updated_idx');
    });

    await knex.raw(`
      ALTER TABLE demand_keyword_candidates
      ADD CONSTRAINT demand_keyword_candidates_confidence_check
      CHECK (confidence IN ('unknown', 'low', 'medium', 'high'))
    `);
    await knex.raw(`
      ALTER TABLE demand_metric_snapshots
      ADD CONSTRAINT demand_metric_snapshots_status_check
      CHECK (
        metric_status IN (
          'provider_backed',
          'owned_data_backed',
          'fallback_only',
          'unknown'
        )
      )
    `);
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('demand_candidate_pages');
    await knex.schema.dropTableIfExists('demand_metric_snapshots');
    await knex.schema.dropTableIfExists('demand_observations');
    await knex.schema.dropTableIfExists('demand_keyword_candidates');
  },
};
