import { Knex } from 'knex';

export const entityAliasFoundationMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('entities', (table) => {
      table.uuid('id').primary();
      table.string('canonical_name', 240).notNullable();
      table.string('normalized_canonical_name', 240).notNullable();
      table.string('entity_type', 80).notNullable();
      table.string('vertical', 120).nullable();
      table.text('description').nullable();
      table.decimal('confidence', 5, 4).notNullable();
      table.jsonb('source').notNullable();
      table.string('review_status', 40).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.index(['entity_type', 'review_status'], 'entities_type_status_idx');
      table.index(['vertical'], 'entities_vertical_idx');
    });

    await knex.raw(`
      CREATE UNIQUE INDEX entities_identity_unique
      ON entities (
        normalized_canonical_name,
        entity_type,
        COALESCE(vertical, '__global__')
      )
    `);

    await knex.schema.createTable('entity_aliases', (table) => {
      table.uuid('id').primary();
      table
        .uuid('entity_id')
        .notNullable()
        .references('entities.id')
        .onDelete('CASCADE');
      table.string('alias_text', 240).notNullable();
      table.string('normalized_alias_text', 240).notNullable();
      table.string('language', 40).nullable();
      table.jsonb('geo').nullable();
      table.string('geo_key', 240).nullable();
      table.string('alias_type', 80).notNullable();
      table.decimal('confidence', 5, 4).notNullable();
      table.string('review_status', 40).notNullable();
      table.jsonb('source').notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.index(
        ['normalized_alias_text', 'review_status'],
        'entity_aliases_lookup_idx',
      );
      table.index(['entity_id', 'review_status'], 'entity_aliases_entity_idx');
    });

    await knex.raw(`
      CREATE UNIQUE INDEX entity_aliases_identity_unique
      ON entity_aliases (
        entity_id,
        normalized_alias_text,
        COALESCE(language, '__any__'),
        COALESCE(geo_key, '__any__')
      )
    `);

    await knex.schema.createTable('entity_mentions', (table) => {
      table.uuid('id').primary();
      table
        .uuid('entity_id')
        .notNullable()
        .references('entities.id')
        .onDelete('CASCADE');
      table
        .uuid('alias_id')
        .nullable()
        .references('entity_aliases.id')
        .onDelete('SET NULL');
      table
        .uuid('chunk_id')
        .notNullable()
        .references('chunks.id')
        .onDelete('CASCADE');
      table.string('mention_text', 240).notNullable();
      table.integer('start_offset').nullable();
      table.integer('end_offset').nullable();
      table.string('location_hint', 240).nullable();
      table.string('language', 40).nullable();
      table.jsonb('geo').nullable();
      table.decimal('confidence', 5, 4).notNullable();
      table.jsonb('source').notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(['chunk_id'], 'entity_mentions_chunk_idx');
      table.index(['entity_id'], 'entity_mentions_entity_idx');
    });

    await knex.raw(`
      ALTER TABLE entities
      ADD CONSTRAINT entities_review_status_check
      CHECK (
        review_status IN ('approved', 'suggested', 'rejected', 'deprecated')
      )
    `);
    await knex.raw(`
      ALTER TABLE entities
      ADD CONSTRAINT entities_confidence_check
      CHECK (confidence >= 0 AND confidence <= 1)
    `);
    await knex.raw(`
      ALTER TABLE entity_aliases
      ADD CONSTRAINT entity_aliases_review_status_check
      CHECK (
        review_status IN ('approved', 'suggested', 'rejected', 'deprecated')
      )
    `);
    await knex.raw(`
      ALTER TABLE entity_aliases
      ADD CONSTRAINT entity_aliases_confidence_check
      CHECK (confidence >= 0 AND confidence <= 1)
    `);
    await knex.raw(`
      ALTER TABLE entity_mentions
      ADD CONSTRAINT entity_mentions_confidence_check
      CHECK (confidence >= 0 AND confidence <= 1)
    `);
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('entity_mentions');
    await knex.schema.dropTableIfExists('entity_aliases');
    await knex.schema.dropTableIfExists('entities');
  },
};
