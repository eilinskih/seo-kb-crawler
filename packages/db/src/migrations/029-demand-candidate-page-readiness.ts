import { Knex } from 'knex';

export const demandCandidatePageReadinessMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('demand_candidate_pages', (table) => {
      table.string('readiness', 40).notNullable().defaultTo('not_ready');
      table.string('primary_intent', 120).nullable();
      table.string('cluster_key', 240).nullable();
      table.string('cluster_label', 240).nullable();
      table.jsonb('evidence_urls').notNullable().defaultTo('[]');
      table.jsonb('missing_research_gaps').notNullable().defaultTo('[]');

      table.index(
        ['topic_id', 'readiness', 'updated_at'],
        'demand_candidate_pages_topic_readiness_updated_idx',
      );
      table.index(
        ['topic_id', 'cluster_key'],
        'demand_candidate_pages_topic_cluster_idx',
      );
    });

    await knex.raw(`
      ALTER TABLE demand_candidate_pages
      ADD CONSTRAINT demand_candidate_pages_readiness_check
      CHECK (readiness IN ('ready', 'partial', 'not_ready'))
    `);
  },

  async down(knex: Knex): Promise<void> {
    await knex.raw(`
      ALTER TABLE demand_candidate_pages
      DROP CONSTRAINT IF EXISTS demand_candidate_pages_readiness_check
    `);
    await knex.schema.alterTable('demand_candidate_pages', (table) => {
      table.dropIndex(
        ['topic_id', 'cluster_key'],
        'demand_candidate_pages_topic_cluster_idx',
      );
      table.dropIndex(
        ['topic_id', 'readiness', 'updated_at'],
        'demand_candidate_pages_topic_readiness_updated_idx',
      );
      table.dropColumn('missing_research_gaps');
      table.dropColumn('evidence_urls');
      table.dropColumn('cluster_label');
      table.dropColumn('cluster_key');
      table.dropColumn('primary_intent');
      table.dropColumn('readiness');
    });
  },
};
