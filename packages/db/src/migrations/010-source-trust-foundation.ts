import { Knex } from 'knex';

export const sourceTrustFoundationMigration: Knex.Migration = {
  async up(knex: Knex): Promise<void> {
    await knex.schema.createTable('source_profiles', (table) => {
      table.uuid('id').primary();
      table.text('source_url').notNullable();
      table.text('canonical_url').nullable();
      table.text('source_domain').nullable();
      table.string('source_type', 80).notNullable();
      table.string('review_status', 40).notNullable();
      table.string('rule_version', 120).notNullable();
      table.jsonb('score_components').notNullable();
      table.decimal('source_trust_score', 5, 4).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.index(['source_domain'], 'source_profiles_domain_idx');
      table.index(['source_type'], 'source_profiles_type_idx');
    });

    await knex.schema.createTable('source_trust_scores', (table) => {
      table.uuid('id').primary();
      table
        .uuid('source_profile_id')
        .nullable()
        .references('source_profiles.id')
        .onDelete('SET NULL');
      table.text('source_url').notNullable();
      table.text('canonical_url').nullable();
      table.text('source_domain').nullable();
      table.string('source_type', 80).notNullable();
      table.string('rule_version', 120).notNullable();
      table.jsonb('input_signals').notNullable();
      table.jsonb('score_components').notNullable();
      table.decimal('source_trust_score', 5, 4).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(['source_profile_id'], 'source_trust_scores_profile_idx');
      table.index(['source_domain'], 'source_trust_scores_domain_idx');
      table.index(['created_at'], 'source_trust_scores_created_idx');
    });

    await knex.schema.createTable('evidence_links', (table) => {
      table.uuid('id').primary();
      table
        .uuid('canonical_fact_id')
        .nullable()
        .references('canonical_facts.id')
        .onDelete('CASCADE');
      table
        .uuid('entity_id')
        .nullable()
        .references('entities.id')
        .onDelete('CASCADE');
      table
        .uuid('chunk_id')
        .notNullable()
        .references('chunks.id')
        .onDelete('CASCADE');
      table
        .uuid('document_id')
        .notNullable()
        .references('documents.id')
        .onDelete('CASCADE');
      table
        .uuid('document_version_id')
        .notNullable()
        .references('document_versions.id')
        .onDelete('CASCADE');
      table
        .uuid('source_profile_id')
        .nullable()
        .references('source_profiles.id')
        .onDelete('SET NULL');
      table.string('evidence_role', 80).notNullable();
      table.decimal('confidence', 5, 4).nullable();
      table.jsonb('provenance').notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();

      table.index(['canonical_fact_id'], 'evidence_links_fact_idx');
      table.index(['entity_id'], 'evidence_links_entity_idx');
      table.index(['chunk_id'], 'evidence_links_chunk_idx');
      table.index(['source_profile_id'], 'evidence_links_source_profile_idx');
    });

    await knex.schema.createTable('fact_scores', (table) => {
      table.uuid('id').primary();
      table
        .uuid('canonical_fact_id')
        .notNullable()
        .references('canonical_facts.id')
        .onDelete('CASCADE');
      table.decimal('evidence_strength', 5, 4).notNullable();
      table.decimal('source_trust_score', 5, 4).nullable();
      table.decimal('extraction_confidence', 5, 4).notNullable();
      table.decimal('normalization_confidence', 5, 4).nullable();
      table.decimal('final_confidence', 5, 4).notNullable();
      table.jsonb('score_components').notNullable();
      table.jsonb('uncertainty_flags').notNullable();
      table.string('rule_version', 120).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.unique(['canonical_fact_id'], 'fact_scores_fact_unique');
      table.index(['final_confidence'], 'fact_scores_final_confidence_idx');
    });

    await knex.schema.createTable('entity_scores', (table) => {
      table.uuid('id').primary();
      table
        .uuid('entity_id')
        .notNullable()
        .references('entities.id')
        .onDelete('CASCADE');
      table.decimal('alias_confidence', 5, 4).nullable();
      table.integer('mention_count').notNullable();
      table.decimal('source_diversity_score', 5, 4).notNullable();
      table.decimal('average_source_trust', 5, 4).nullable();
      table.decimal('final_confidence', 5, 4).notNullable();
      table.jsonb('score_components').notNullable();
      table.string('rule_version', 120).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.unique(['entity_id'], 'entity_scores_entity_unique');
      table.index(['final_confidence'], 'entity_scores_final_confidence_idx');
    });

    await addScoreCheck(knex, 'source_profiles', 'source_trust_score');
    await addScoreCheck(knex, 'source_trust_scores', 'source_trust_score');
    await addScoreCheck(knex, 'evidence_links', 'confidence');
    await addScoreCheck(knex, 'fact_scores', 'evidence_strength');
    await addScoreCheck(knex, 'fact_scores', 'source_trust_score');
    await addScoreCheck(knex, 'fact_scores', 'extraction_confidence');
    await addScoreCheck(knex, 'fact_scores', 'normalization_confidence');
    await addScoreCheck(knex, 'fact_scores', 'final_confidence');
    await addScoreCheck(knex, 'entity_scores', 'alias_confidence');
    await addScoreCheck(knex, 'entity_scores', 'source_diversity_score');
    await addScoreCheck(knex, 'entity_scores', 'average_source_trust');
    await addScoreCheck(knex, 'entity_scores', 'final_confidence');
    await addSourceTypeCheck(knex, 'source_profiles');
    await addSourceTypeCheck(knex, 'source_trust_scores');
    await knex.raw(`
      ALTER TABLE source_profiles
      ADD CONSTRAINT source_profiles_review_status_check
      CHECK (
        review_status IN ('inferred', 'reviewed', 'overridden', 'deprecated')
      )
    `);
    await knex.raw(`
      ALTER TABLE entity_scores
      ADD CONSTRAINT entity_scores_mention_count_check
      CHECK (mention_count >= 0)
    `);
  },

  async down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('entity_scores');
    await knex.schema.dropTableIfExists('fact_scores');
    await knex.schema.dropTableIfExists('evidence_links');
    await knex.schema.dropTableIfExists('source_trust_scores');
    await knex.schema.dropTableIfExists('source_profiles');
  },
};

async function addScoreCheck(
  knex: Knex,
  tableName: string,
  columnName: string,
): Promise<void> {
  await knex.raw(`
    ALTER TABLE ${tableName}
    ADD CONSTRAINT ${tableName}_${columnName}_check
    CHECK (${columnName} IS NULL OR (${columnName} >= 0 AND ${columnName} <= 1))
  `);
}

async function addSourceTypeCheck(knex: Knex, tableName: string): Promise<void> {
  await knex.raw(`
    ALTER TABLE ${tableName}
    ADD CONSTRAINT ${tableName}_source_type_check
    CHECK (
      source_type IN (
        'official_documentation',
        'government',
        'manufacturer',
        'vendor',
        'news',
        'wiki_reference',
        'forum_community',
        'user_generated',
        'marketplace',
        'affiliate',
        'unknown'
      )
    )
  `);
}
