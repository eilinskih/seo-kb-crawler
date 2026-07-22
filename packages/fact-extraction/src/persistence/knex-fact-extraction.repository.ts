import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  CanonicalFactForStorage,
  ChunkForFactExtraction,
  FactExtractionFailure,
  FactExtractionProfile,
  FactExtractionProviderIdentity,
  FactExtractionRepository,
  FactExtractionResult,
  FactExtractionRunIdentity,
  FactExtractionRunRecord,
  FactExtractionRunStatus,
  FactNormalizationAttemptForStorage,
  RawFactForStorage,
} from '../domain/fact-extraction-types';

interface ChunkRow {
  id: string;
  chunking_run_id: string;
  document_id: string;
  document_version_id: string;
  topic_id: string;
  text: string;
  heading_path: string[];
  section_title: string | null;
  chunk_type: ChunkForFactExtraction['chunkType'];
  token_count: number;
  language: string | null;
  geo_hints: ChunkForFactExtraction['geoHints'];
  source_metadata: ChunkForFactExtraction['sourceMetadata'];
  content_hash: string;
  normalized_text_hash: string;
  metadata?: ChunkForFactExtraction['documentMetadata'];
}

interface FactExtractionRunRow {
  id: string;
  topic_id: string;
  document_id: string;
  document_version_id: string;
  chunk_id: string;
  chunk_content_hash: string;
  profile_key: string;
  profile_version: string;
  provider_key: string;
  model_key: string;
  model_version: string;
  status: FactExtractionRunStatus;
  failure: FactExtractionFailure | null;
  started_at: Date | string | null;
  completed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface RawFactRow {
  id: string;
  extraction_run_id: string | null;
  subject_entity_id: string;
  object_candidate: unknown;
  predicate_candidate: string;
  attributes_candidate: Record<string, unknown>;
  source_chunk_id: string;
  source_document_version_id: string | null;
  extraction_model: FactExtractionProviderIdentity;
  confidence: number;
  field_confidence: Record<string, number> | null;
  evidence_text: string | null;
  status: 'pending' | 'normalized' | 'rejected';
  normalization_notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CanonicalFactRow {
  id: string;
  subject_entity_id: string;
  object_entity_id: string | null;
  predicate_id: string;
  normalized_attributes: Record<string, unknown>;
  source_chunk_id: string;
  source_document_version_id: string | null;
  confidence: number;
  provenance: Record<string, unknown>;
  created_at: Date | string;
  updated_at: Date | string;
}

interface FactNormalizationAttemptRow {
  id: string;
  raw_fact_id: string | null;
  extraction_run_id: string;
  predicate_resolution_status: string;
  predicate_id: string | null;
  predicate_alias_id: string | null;
  canonical_fact_id: string | null;
  rejection_reason: string | null;
  created_at: Date | string;
}

@Injectable()
export class KnexFactExtractionRepository implements FactExtractionRepository {
  constructor(private readonly db: DbService) {}

  async findExtractionCandidates(options: {
    limit: number;
    profile: FactExtractionProfile;
    provider: FactExtractionProviderIdentity;
  }): Promise<ChunkForFactExtraction[]> {
    const knex = this.db.knex;
    const rows = await knex<ChunkRow>('chunks')
      .leftJoin<FactExtractionRunRow>('fact_extraction_runs', function join() {
        this.on('chunks.id', '=', 'fact_extraction_runs.chunk_id')
          .andOn(
            'fact_extraction_runs.chunk_content_hash',
            '=',
            'chunks.content_hash',
          )
          .andOn(
            'fact_extraction_runs.profile_key',
            '=',
            knex.raw('?', [options.profile.key]),
          )
          .andOn(
            'fact_extraction_runs.profile_version',
            '=',
            knex.raw('?', [options.profile.version]),
          )
          .andOn(
            'fact_extraction_runs.provider_key',
            '=',
            knex.raw('?', [options.provider.providerKey]),
          )
          .andOn(
            'fact_extraction_runs.model_key',
            '=',
            knex.raw('?', [options.provider.modelKey]),
          )
          .andOn(
            'fact_extraction_runs.model_version',
            '=',
            knex.raw('?', [options.provider.modelVersion]),
          );
      })
      .leftJoin('document_versions', 'chunks.document_version_id', 'document_versions.id')
      .where('chunks.token_count', '>=', options.profile.minChunkTokens)
      .where((builder) =>
        builder
          .whereNull('fact_extraction_runs.id')
          .orWhere('fact_extraction_runs.status', 'failed_retryable'),
      )
      .orderBy('chunks.created_at', 'asc')
      .limit(options.limit)
      .select([
        'chunks.*',
        'document_versions.metadata as metadata',
      ]);

    return rows.map(toChunk);
  }

  async findChunksByIds(chunkIds: string[]): Promise<ChunkForFactExtraction[]> {
    if (chunkIds.length === 0) {
      return [];
    }
    const rows = await this.db.knex<ChunkRow>('chunks')
      .leftJoin('document_versions', 'chunks.document_version_id', 'document_versions.id')
      .whereIn('chunks.id', chunkIds)
      .orderBy('chunks.chunk_index', 'asc')
      .select([
        'chunks.*',
        'document_versions.metadata as metadata',
      ]);

    return rows.map(toChunk);
  }

  async findRun(
    identity: FactExtractionRunIdentity,
  ): Promise<FactExtractionRunRecord | null> {
    const row = await this.db.knex<FactExtractionRunRow>('fact_extraction_runs')
      .where({
        chunk_id: identity.chunkId,
        document_version_id: identity.documentVersionId,
        profile_key: identity.profileKey,
        profile_version: identity.profileVersion,
        provider_key: identity.providerKey,
        model_key: identity.modelKey,
        model_version: identity.modelVersion,
        chunk_content_hash: identity.chunkContentHash,
      })
      .first();

    return row ? toRun(row) : null;
  }

  async startRun(
    chunk: ChunkForFactExtraction,
    identity: FactExtractionRunIdentity,
    options: {
      now: Date;
    },
  ): Promise<FactExtractionRunRecord> {
    const existing = await this.findRun(identity);
    const row: FactExtractionRunRow = {
      id: existing?.id ?? randomUUID(),
      topic_id: chunk.topicId,
      document_id: chunk.documentId,
      document_version_id: chunk.documentVersionId,
      chunk_id: chunk.id,
      chunk_content_hash: chunk.contentHash,
      profile_key: identity.profileKey,
      profile_version: identity.profileVersion,
      provider_key: identity.providerKey,
      model_key: identity.modelKey,
      model_version: identity.modelVersion,
      status: 'extracting',
      failure: null,
      started_at: options.now,
      completed_at: null,
      created_at: existing?.createdAt ?? options.now,
      updated_at: options.now,
    };

    await this.db.knex<FactExtractionRunRow>('fact_extraction_runs')
      .insert(row)
      .onConflict([
        'chunk_id',
        'document_version_id',
        'profile_key',
        'profile_version',
        'provider_key',
        'model_key',
        'model_version',
        'chunk_content_hash',
      ])
      .merge({
        status: row.status,
        failure: row.failure,
        started_at: row.started_at,
        completed_at: row.completed_at,
        updated_at: row.updated_at,
      });

    return toRun(row);
  }

  async markRunSkipped(
    run: FactExtractionRunRecord,
    failure: FactExtractionFailure,
    options: {
      now: Date;
    },
  ): Promise<void> {
    await this.updateRunStatus(run.id, 'skipped', failure, options.now);
  }

  async markRunFailed(
    run: FactExtractionRunRecord,
    failure: FactExtractionFailure,
    options: {
      now: Date;
    },
  ): Promise<void> {
    await this.updateRunStatus(
      run.id,
      failure.retryable ? 'failed_retryable' : 'failed_terminal',
      failure,
      options.now,
    );
  }

  async saveExtractionOutcome(
    run: FactExtractionRunRecord,
    outcome: {
      rawFacts: RawFactForStorage[];
      canonicalFacts: CanonicalFactForStorage[];
      normalizationAttempts: FactNormalizationAttemptForStorage[];
    },
    options: {
      now: Date;
    },
  ): Promise<FactExtractionResult> {
    const rawRows = outcome.rawFacts.map((fact) => rawFactRow(fact, options.now));
    const canonicalRows = outcome.canonicalFacts.map((fact) =>
      canonicalFactRow(fact, options.now),
    );

    await this.db.knex.transaction(async (trx) => {
      if (rawRows.length > 0) {
        await trx<RawFactRow>('raw_facts').insert(rawRows);
      }
      if (canonicalRows.length > 0) {
        await trx<CanonicalFactRow>('canonical_facts').insert(canonicalRows);
      }

      const attemptRows = outcome.normalizationAttempts.map((attempt) =>
        normalizationAttemptRow(
          attempt,
          rawRows[attempt.rawFactIndex ?? -1]?.id ?? null,
          canonicalRows[attempt.canonicalFactIndex ?? -1]?.id ?? null,
          options.now,
        ),
      );
      if (attemptRows.length > 0) {
        await trx<FactNormalizationAttemptRow>('fact_normalization_attempts')
          .insert(attemptRows);
      }

      await trx<FactExtractionRunRow>('fact_extraction_runs')
        .where({ id: run.id })
        .update({
          status: 'completed',
          failure: null,
          completed_at: options.now,
          updated_at: options.now,
        });
    });

    return {
      status: 'completed',
      runId: run.id,
      rawFactCount: rawRows.length,
      canonicalFactCount: canonicalRows.length,
      rejectedCount: outcome.normalizationAttempts.filter((attempt) =>
        attempt.rejectionReason,
      ).length,
    };
  }

  private async updateRunStatus(
    runId: string,
    status: FactExtractionRunStatus,
    failure: FactExtractionFailure | null,
    now: Date,
  ): Promise<void> {
    await this.db.knex<FactExtractionRunRow>('fact_extraction_runs')
      .where({ id: runId })
      .update({
        status,
        failure,
        completed_at: now,
        updated_at: now,
      });
  }
}

function toChunk(row: ChunkRow): ChunkForFactExtraction {
  return {
    id: row.id,
    chunkingRunId: row.chunking_run_id,
    documentId: row.document_id,
    documentVersionId: row.document_version_id,
    topicId: row.topic_id,
    text: row.text,
    headingPath: row.heading_path,
    sectionTitle: row.section_title,
    chunkType: row.chunk_type,
    tokenCount: row.token_count,
    language: row.language,
    geoHints: row.geo_hints,
    sourceMetadata: row.source_metadata,
    documentMetadata: row.metadata ?? null,
    contentHash: row.content_hash,
    normalizedTextHash: row.normalized_text_hash,
  };
}

function toRun(row: FactExtractionRunRow): FactExtractionRunRecord {
  return {
    id: row.id,
    topicId: row.topic_id,
    documentId: row.document_id,
    documentVersionId: row.document_version_id,
    chunkId: row.chunk_id,
    chunkContentHash: row.chunk_content_hash,
    profileKey: row.profile_key,
    profileVersion: row.profile_version,
    providerKey: row.provider_key,
    modelKey: row.model_key,
    modelVersion: row.model_version,
    status: row.status,
    failure: row.failure,
    startedAt: row.started_at ? new Date(row.started_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function rawFactRow(fact: RawFactForStorage, now: Date): RawFactRow {
  return {
    id: randomUUID(),
    extraction_run_id: fact.extractionRunId,
    subject_entity_id: fact.subjectEntityId,
    object_candidate: fact.objectCandidate,
    predicate_candidate: fact.predicateCandidate,
    attributes_candidate: fact.attributesCandidate,
    source_chunk_id: fact.sourceChunkId,
    source_document_version_id: fact.sourceDocumentVersionId,
    extraction_model: fact.extractionModel,
    confidence: fact.confidence,
    field_confidence: fact.fieldConfidence,
    evidence_text: fact.evidenceText,
    status: 'pending',
    normalization_notes: null,
    created_at: now,
    updated_at: now,
  };
}

function canonicalFactRow(
  fact: CanonicalFactForStorage,
  now: Date,
): CanonicalFactRow {
  return {
    id: randomUUID(),
    subject_entity_id: fact.subjectEntityId,
    object_entity_id: fact.objectEntityId,
    predicate_id: fact.predicateId,
    normalized_attributes: fact.normalizedAttributes,
    source_chunk_id: fact.sourceChunkId,
    source_document_version_id: fact.sourceDocumentVersionId,
    confidence: fact.confidence,
    provenance: fact.provenance,
    created_at: now,
    updated_at: now,
  };
}

function normalizationAttemptRow(
  attempt: FactNormalizationAttemptForStorage,
  rawFactId: string | null,
  canonicalFactId: string | null,
  now: Date,
): FactNormalizationAttemptRow {
  return {
    id: randomUUID(),
    raw_fact_id: rawFactId,
    extraction_run_id: attempt.extractionRunId,
    predicate_resolution_status: attempt.predicateResolutionStatus,
    predicate_id: attempt.predicateId,
    predicate_alias_id: attempt.predicateAliasId,
    canonical_fact_id: canonicalFactId,
    rejection_reason: attempt.rejectionReason,
    created_at: now,
  };
}
