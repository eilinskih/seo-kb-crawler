import { Knex } from 'knex';

export const seoConsensusFoundationMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('consensus_groups', (table) => {
      table.uuid('id').primary();
      table.string('group_key', 320).notNullable();
      table
        .uuid('subject_entity_id')
        .notNullable()
        .references('entities.id')
        .onDelete('CASCADE');
      table
        .uuid('predicate_id')
        .notNullable()
        .references('ontology_predicates.id')
        .onDelete('CASCADE');
      table.string('comparable_key', 160).notNullable();
      table.jsonb('strongest_value').nullable();
      table.jsonb('support_counts').notNullable();
      table.jsonb('score_summary').notNullable();
      table.jsonb('alternatives').notNullable();
      table.string('status', 40).notNullable();
      table.string('rule_version', 120).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.unique(['group_key'], 'consensus_groups_group_key_unique');
      table.index(
        ['subject_entity_id', 'predicate_id'],
        'consensus_groups_entity_predicate_idx',
      );
    });

    await knex.schema.createTable('conflict_sets', (table) => {
      table.uuid('id').primary();
      table.string('conflict_key', 340).notNullable();
      table.string('group_key', 320).notNullable();
      table
        .uuid('subject_entity_id')
        .notNullable()
        .references('entities.id')
        .onDelete('CASCADE');
      table
        .uuid('predicate_id')
        .notNullable()
        .references('ontology_predicates.id')
        .onDelete('CASCADE');
      table.string('comparable_key', 160).notNullable();
      table.jsonb('competing_values').notNullable();
      table.string('severity', 40).notNullable();
      table.string('suggested_handling', 80).notNullable();
      table.string('status', 40).notNullable();
      table.string('rule_version', 120).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.unique(['conflict_key'], 'conflict_sets_conflict_key_unique');
      table.index(
        ['subject_entity_id', 'predicate_id'],
        'conflict_sets_entity_predicate_idx',
      );
    });

    await knex.schema.createTable('seo_phrasing_hints', (table) => {
      table.uuid('id').primary();
      table.string('target_type', 80).notNullable();
      table.string('target_key', 340).notNullable();
      table.string('hint_type', 80).notNullable();
      table.jsonb('hint_payload').notNullable();
      table.string('rule_version', 120).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(['target_type', 'target_key'], 'seo_hints_target_idx');
      table.index(['hint_type'], 'seo_hints_type_idx');
    });

    await knex.schema.createTable('content_gap_hints', (table) => {
      table.uuid('id').primary();
      table.string('target_key', 340).notNullable();
      table.string('gap_type', 80).notNullable();
      table.text('reason').notNullable();
      table.text('suggested_angle').notNullable();
      table.string('rule_version', 120).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(['target_key'], 'content_gap_hints_target_idx');
      table.index(['gap_type'], 'content_gap_hints_type_idx');
    });

    await addStatusCheck(knex, 'consensus_groups', [
      'active',
      'superseded',
    ]);
    await addStatusCheck(knex, 'conflict_sets', [
      'active',
      'resolved',
      'deprecated',
    ]);
    await knex.raw(`
      ALTER TABLE conflict_sets
      ADD CONSTRAINT conflict_sets_severity_check
      CHECK (severity IN ('none', 'low', 'medium', 'high'))
    `);
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('content_gap_hints');
    await knex.schema.dropTableIfExists('seo_phrasing_hints');
    await knex.schema.dropTableIfExists('conflict_sets');
    await knex.schema.dropTableIfExists('consensus_groups');
  },
};

async function addStatusCheck(
  knex: Knex,
  tableName: string,
  statuses: string[],
): Promise<void> {
  await knex.raw(`
    ALTER TABLE ${tableName}
    ADD CONSTRAINT ${tableName}_status_check
    CHECK (status IN (${statuses.map(() => '?').join(', ')}))
  `, statuses);
}
