import { Knex } from 'knex';

export const ontologyPredicateRegistryMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('ontology_entity_types', (table) => {
      table.uuid('id').primary();
      table.string('key', 120).notNullable();
      table.string('label', 160).notNullable();
      table.text('description').notNullable();
      table.string('vertical', 120).nullable();
      table.jsonb('aliases').notNullable();
      table.jsonb('examples').notNullable();
      table.text('usage_notes').nullable();
      table.string('review_status', 40).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.index(['review_status'], 'ontology_entity_types_status_idx');
    });

    await knex.raw(`
      CREATE UNIQUE INDEX ontology_entity_types_key_vertical_unique
      ON ontology_entity_types (key, COALESCE(vertical, '__global__'))
    `);

    await knex.schema.createTable('ontology_attribute_schemas', (table) => {
      table.string('key', 120).primary();
      table.jsonb('schema').notNullable();
      table.text('description').notNullable();
      table.jsonb('examples').notNullable();
      table.string('review_status', 40).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();
    });

    await knex.schema.createTable('ontology_predicates', (table) => {
      table.uuid('id').primary();
      table.string('key', 120).notNullable();
      table.string('label', 160).notNullable();
      table.text('description').notNullable();
      table.jsonb('subject_entity_types').notNullable();
      table.jsonb('object_entity_types').notNullable();
      table
        .string('attribute_schema_key', 120)
        .nullable()
        .references('ontology_attribute_schemas.key')
        .onDelete('RESTRICT');
      table.string('vertical', 120).nullable();
      table.jsonb('aliases').notNullable();
      table.jsonb('examples').notNullable();
      table.text('usage_notes').nullable();
      table.string('review_status', 40).notNullable();
      table.uuid('replacement_predicate_id').nullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.index(['review_status'], 'ontology_predicates_status_idx');
    });

    await knex.raw(`
      CREATE UNIQUE INDEX ontology_predicates_key_vertical_unique
      ON ontology_predicates (key, COALESCE(vertical, '__global__'))
    `);

    await knex.schema.createTable('ontology_predicate_aliases', (table) => {
      table.uuid('id').primary();
      table
        .uuid('predicate_id')
        .notNullable()
        .references('ontology_predicates.id')
        .onDelete('CASCADE');
      table.string('alias_text', 240).notNullable();
      table.string('normalized_alias_text', 240).notNullable();
      table.string('language', 40).nullable();
      table.string('vertical', 120).nullable();
      table.decimal('confidence', 5, 4).notNullable();
      table.string('review_status', 40).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.index(
        ['normalized_alias_text', 'review_status'],
        'ontology_predicate_aliases_lookup_idx',
      );
    });

    await knex.raw(`
      CREATE UNIQUE INDEX ontology_predicate_aliases_unique
      ON ontology_predicate_aliases (
        predicate_id,
        normalized_alias_text,
        COALESCE(language, '__any__'),
        COALESCE(vertical, '__global__')
      )
    `);

    await knex.schema.createTable('raw_facts', (table) => {
      table.uuid('id').primary();
      table
        .uuid('subject_entity_id')
        .notNullable()
        .references('entities.id')
        .onDelete('CASCADE');
      table.jsonb('object_candidate').notNullable();
      table.string('predicate_candidate', 240).notNullable();
      table.jsonb('attributes_candidate').notNullable();
      table
        .uuid('source_chunk_id')
        .notNullable()
        .references('chunks.id')
        .onDelete('CASCADE');
      table.jsonb('extraction_model').notNullable();
      table.decimal('confidence', 5, 4).notNullable();
      table.string('status', 40).notNullable();
      table.text('normalization_notes').nullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.index(['status'], 'raw_facts_status_idx');
      table.index(['source_chunk_id'], 'raw_facts_source_chunk_idx');
    });

    await knex.schema.createTable('canonical_facts', (table) => {
      table.uuid('id').primary();
      table
        .uuid('subject_entity_id')
        .notNullable()
        .references('entities.id')
        .onDelete('CASCADE');
      table
        .uuid('object_entity_id')
        .nullable()
        .references('entities.id')
        .onDelete('SET NULL');
      table
        .uuid('predicate_id')
        .notNullable()
        .references('ontology_predicates.id')
        .onDelete('RESTRICT');
      table.jsonb('normalized_attributes').notNullable();
      table
        .uuid('source_chunk_id')
        .notNullable()
        .references('chunks.id')
        .onDelete('CASCADE');
      table.decimal('confidence', 5, 4).notNullable();
      table.jsonb('provenance').notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.index(['subject_entity_id'], 'canonical_facts_subject_idx');
      table.index(['predicate_id'], 'canonical_facts_predicate_idx');
      table.index(['source_chunk_id'], 'canonical_facts_source_chunk_idx');
    });

    await addReviewStatusCheck(knex, 'ontology_entity_types');
    await addReviewStatusCheck(knex, 'ontology_attribute_schemas');
    await addReviewStatusCheck(knex, 'ontology_predicates');
    await addReviewStatusCheck(knex, 'ontology_predicate_aliases');
    await knex.raw(`
      ALTER TABLE raw_facts
      ADD CONSTRAINT raw_facts_status_check
      CHECK (status IN ('pending', 'normalized', 'rejected'))
    `);
    await addConfidenceCheck(knex, 'ontology_predicate_aliases');
    await addConfidenceCheck(knex, 'raw_facts');
    await addConfidenceCheck(knex, 'canonical_facts');
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('canonical_facts');
    await knex.schema.dropTableIfExists('raw_facts');
    await knex.schema.dropTableIfExists('ontology_predicate_aliases');
    await knex.schema.dropTableIfExists('ontology_predicates');
    await knex.schema.dropTableIfExists('ontology_attribute_schemas');
    await knex.schema.dropTableIfExists('ontology_entity_types');
  },
};

async function addReviewStatusCheck(
  knex: Knex,
  tableName: string,
): Promise<void> {
  await knex.raw(`
    ALTER TABLE ${tableName}
    ADD CONSTRAINT ${tableName}_review_status_check
    CHECK (review_status IN ('draft', 'approved', 'deprecated'))
  `);
}

async function addConfidenceCheck(
  knex: Knex,
  tableName: string,
): Promise<void> {
  await knex.raw(`
    ALTER TABLE ${tableName}
    ADD CONSTRAINT ${tableName}_confidence_check
    CHECK (confidence >= 0 AND confidence <= 1)
  `);
}
