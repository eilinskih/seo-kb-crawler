import { Knex } from 'knex';

export const entityAliasReviewAuditMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('entity_aliases', (table) => {
      table.timestamp('reviewed_at', { useTz: true }).nullable();
      table.string('reviewed_by', 160).nullable();
      table.text('review_note').nullable();
    });
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('entity_aliases', (table) => {
      table.dropColumn('review_note');
      table.dropColumn('reviewed_by');
      table.dropColumn('reviewed_at');
    });
  },
};
