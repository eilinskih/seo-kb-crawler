import { Knex } from 'knex';

export const seoAgentGenerationPersistenceMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('seo_agent_generation_contexts', (table) => {
      table.uuid('id').primary();
      table.string('gateway_request_key', 700).notNullable();
      table.string('topic_id', 120).notNullable();
      table.text('query').notNullable();
      table.string('objective', 80).notNullable();
      table.string('page_type', 80).nullable();
      table.string('language', 40).nullable();
      table.jsonb('geo').nullable();
      table.jsonb('source_pack_references').notNullable();
      table.jsonb('context').notNullable();
      table.string('fallback_state', 40).notNullable();
      table.boolean('degraded').notNullable();
      table.jsonb('warnings').notNullable();
      table.string('rule_version', 80).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(
        ['topic_id', 'created_at'],
        'seo_agent_contexts_topic_created_idx',
      );
      table.index(
        ['gateway_request_key', 'created_at'],
        'seo_agent_contexts_request_created_idx',
      );
    });

    await knex.schema.createTable('seo_agent_generation_responses', (table) => {
      table.uuid('id').primary();
      table.string('gateway_request_key', 700).notNullable();
      table.string('topic_id', 120).notNullable();
      table.text('query').notNullable();
      table.string('objective', 80).notNullable();
      table.string('provider_key', 120).nullable();
      table.string('model_family', 120).nullable();
      table.string('status', 40).notNullable();
      table.boolean('degraded').notNullable();
      table.jsonb('prompt').notNullable();
      table.jsonb('provider_result').nullable();
      table.text('final_content').nullable();
      table.jsonb('warnings').notNullable();
      table.jsonb('runtime_result').notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(
        ['topic_id', 'created_at'],
        'seo_agent_responses_topic_created_idx',
      );
      table.index(
        ['gateway_request_key', 'created_at'],
        'seo_agent_responses_request_created_idx',
      );
      table.index(
        ['provider_key', 'created_at'],
        'seo_agent_responses_provider_created_idx',
      );
      table.index(['status', 'created_at'], 'seo_agent_responses_status_idx');
    });
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('seo_agent_generation_responses');
    await knex.schema.dropTableIfExists('seo_agent_generation_contexts');
  },
};
