import { Knex } from 'knex';

export const externalEntityReviewDecisionsMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('external_entity_review_decisions', (table) => {
      table.uuid('id').primary();
      table
        .uuid('attempt_id')
        .notNullable()
        .references('entity_enrichment_attempts.id')
        .onDelete('CASCADE');
      table.string('entity_name', 500).notNullable();
      table.string('subject_type', 40).notNullable();
      table.string('provider_key', 120).notNullable();
      table.string('external_id', 500).nullable();
      table.string('external_id_type', 120).nullable();
      table.string('candidate_name', 500).nullable();
      table.string('decision', 40).notNullable();
      table.string('reviewed_by', 160).notNullable();
      table.text('review_note').nullable();
      table.jsonb('provenance').notNullable().defaultTo('{}');
      table.jsonb('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(['attempt_id'], 'external_entity_review_attempt_idx');
      table.index(
        ['provider_key', 'external_id', 'external_id_type'],
        'external_entity_review_external_idx',
      );
      table.index(['created_at'], 'external_entity_review_created_idx');
    });

    await knex.raw(`
      ALTER TABLE external_entity_review_decisions
      ADD CONSTRAINT external_entity_review_subject_type_check
      CHECK (subject_type IN ('external_id', 'candidate'))
    `);
    await knex.raw(`
      ALTER TABLE external_entity_review_decisions
      ADD CONSTRAINT external_entity_review_decision_check
      CHECK (decision IN ('accepted', 'rejected'))
    `);
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('external_entity_review_decisions');
  },
};
