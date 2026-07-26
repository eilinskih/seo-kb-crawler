import { Knex } from 'knex';

export const researchSchedulerProductionMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('research_scheduler_control_state', (table) => {
      table.string('id', 40).primary();
      table.string('state', 40).notNullable();
      table.text('reason').nullable();
      table.string('updated_by', 200).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();
    });

    await knex.schema.createTable('research_dispatch_plans', (table) => {
      table.uuid('id').primary();
      table.uuid('topic_id').notNullable();
      table.string('mode', 40).notNullable();
      table.string('trigger', 80).notNullable();
      table.string('priority_class', 40).notNullable();
      table.string('objective_type', 120).notNullable();
      table.jsonb('plan').notNullable();
      table.boolean('degraded').notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(['topic_id', 'created_at'], 'research_dispatch_plans_topic_created_idx');
      table.index(['created_at'], 'research_dispatch_plans_created_idx');
    });

    await knex.schema.createTable('research_background_budget_allocations', (table) => {
      table.uuid('id').primary();
      table.uuid('topic_id').notNullable();
      table.string('lifecycle', 40).notNullable();
      table.string('intensity', 40).notNullable();
      table.integer('allocated_crawl_budget').notNullable();
      table.integer('allocated_serp_budget').notNullable();
      table.integer('allocated_discovery_budget').notNullable();
      table.decimal('fairness_weight', 10, 4).notNullable();
      table.boolean('eligible').notNullable();
      table.text('reason').notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(
        ['topic_id', 'created_at'],
        'research_background_allocations_topic_created_idx',
      );
      table.index(['created_at'], 'research_background_allocations_created_idx');
    });

    await knex.schema.createTable('research_dispatch_execution_receipts', (table) => {
      table.uuid('id').primary();
      table.uuid('dispatch_plan_id').nullable()
        .references('research_dispatch_plans.id')
        .onDelete('SET NULL');
      table.uuid('topic_id').notNullable();
      table.string('target', 80).notNullable();
      table.string('status', 40).notNullable();
      table.jsonb('objective').notNullable();
      table.text('message').notNullable();
      table.timestamp('attempted_at', { useTz: true }).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(
        ['dispatch_plan_id'],
        'research_dispatch_receipts_plan_idx',
      );
      table.index(
        ['target', 'status', 'attempted_at'],
        'research_dispatch_receipts_target_status_idx',
      );
    });

    await knex.raw(`
      ALTER TABLE research_scheduler_control_state
      ADD CONSTRAINT research_scheduler_control_state_check
      CHECK (state IN ('enabled', 'paused', 'disabled'))
    `);
    await knex.raw(`
      ALTER TABLE research_dispatch_execution_receipts
      ADD CONSTRAINT research_dispatch_execution_receipts_status_check
      CHECK (status IN ('dispatched', 'failed'))
    `);
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('research_dispatch_execution_receipts');
    await knex.schema.dropTableIfExists('research_background_budget_allocations');
    await knex.schema.dropTableIfExists('research_dispatch_plans');
    await knex.schema.dropTableIfExists('research_scheduler_control_state');
  },
};
