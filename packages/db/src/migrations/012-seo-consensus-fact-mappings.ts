import { Knex } from 'knex';

export const seoConsensusFactMappingsMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('consensus_group_facts', (table) => {
      table.uuid('id').primary();
      table
        .uuid('consensus_group_id')
        .notNullable()
        .references('consensus_groups.id')
        .onDelete('CASCADE');
      table.string('group_key', 320).notNullable();
      table
        .uuid('canonical_fact_id')
        .notNullable()
        .references('canonical_facts.id')
        .onDelete('CASCADE');
      table.string('value_fingerprint', 320).notNullable();
      table.string('support_role', 80).notNullable();
      table.jsonb('score_summary').notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.unique(
        ['consensus_group_id', 'canonical_fact_id'],
        'consensus_group_facts_group_fact_unique',
      );
      table.index(['canonical_fact_id'], 'consensus_group_facts_fact_idx');
      table.index(['group_key'], 'consensus_group_facts_group_key_idx');
    });

    await knex.schema.createTable('conflict_set_facts', (table) => {
      table.uuid('id').primary();
      table
        .uuid('conflict_set_id')
        .notNullable()
        .references('conflict_sets.id')
        .onDelete('CASCADE');
      table.string('conflict_key', 340).notNullable();
      table
        .uuid('canonical_fact_id')
        .notNullable()
        .references('canonical_facts.id')
        .onDelete('CASCADE');
      table.string('value_fingerprint', 320).notNullable();
      table.string('side_label', 160).notNullable();
      table.jsonb('score_summary').notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.unique(
        ['conflict_set_id', 'canonical_fact_id'],
        'conflict_set_facts_set_fact_unique',
      );
      table.index(['canonical_fact_id'], 'conflict_set_facts_fact_idx');
      table.index(['conflict_key'], 'conflict_set_facts_conflict_key_idx');
    });
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('conflict_set_facts');
    await knex.schema.dropTableIfExists('consensus_group_facts');
  },
};
