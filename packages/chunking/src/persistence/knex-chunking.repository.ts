import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  ChunkRecord,
  ChunkingPlan,
  ChunkingRepository,
  ChunkingResult,
  ChunkingRunIdentity,
  ChunkingRunRecord,
  ChunkingRunStatus,
  ChunkType,
  ChunkTypeConfidence,
  DocumentVersionForChunking,
} from '../domain/chunking-types';

interface DocumentVersionRow {
  id: string;
  document_id: string;
  topic_id: string;
  frontier_entry_id: string;
  topic_configuration_version: number;
  requested_url: string;
  final_url: string | null;
  canonical_url: string | null;
  title: string | null;
  meta_description: string | null;
  content_hash: string | null;
  extractor_version: string;
  cleaned_markdown: string | null;
  plain_text: string | null;
  metadata: DocumentVersionForChunking['metadata'];
  structured_data: DocumentVersionForChunking['structuredData'];
  language_hints: DocumentVersionForChunking['languageHints'];
  geo_hints: DocumentVersionForChunking['geoHints'];
  created_at: Date | string;
}

interface ChunkingRunRow {
  id: string;
  document_id: string;
  document_version_id: string;
  topic_id: string;
  status: ChunkingRunStatus;
  chunker_version: string;
  chunking_profile: ChunkingRunRecord['chunkingProfile'];
  tokenizer_key: string;
  tokenizer_version: string;
  failure: ChunkingRunRecord['failure'];
  started_at: Date | string | null;
  completed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ChunkRow {
  id: string;
  chunking_run_id: string;
  document_id: string;
  document_version_id: string;
  topic_id: string;
  frontier_entry_id: string;
  chunk_index: number;
  text: string;
  normalized_text: string;
  heading_path: string[];
  section_title: string | null;
  chunk_type: ChunkType;
  chunk_type_confidence: ChunkTypeConfidence;
  token_count: number;
  language: string | null;
  language_hints: ChunkRecord['languageHints'];
  geo_hints: ChunkRecord['geoHints'];
  source_metadata: ChunkRecord['sourceMetadata'];
  content_hash: string;
  normalized_text_hash: string;
  near_duplicate_group_id: string | null;
  created_at: Date | string;
}

@Injectable()
export class KnexChunkingRepository implements ChunkingRepository {
  constructor(private readonly db: DbService) {}

  async findDocumentVersion(
    documentVersionId: string,
  ): Promise<DocumentVersionForChunking | null> {
    const row = await this.db.knex<DocumentVersionRow>('document_versions')
      .where({ id: documentVersionId })
      .first();

    return row ? toDocumentVersion(row) : null;
  }

  async findRun(identity: ChunkingRunIdentity): Promise<ChunkingRunRecord | null> {
    const row = await this.db.knex<ChunkingRunRow>('chunking_runs')
      .where({
        document_version_id: identity.documentVersionId,
        chunker_version: identity.chunkerVersion,
        chunking_profile: identity.chunkingProfile,
        tokenizer_key: identity.tokenizerKey,
        tokenizer_version: identity.tokenizerVersion,
      })
      .first();

    return row ? toChunkingRun(row) : null;
  }

  async saveChunkingPlan(
    plan: ChunkingPlan,
    options: {
      now: Date;
    },
  ): Promise<ChunkingResult> {
    return this.db.knex.transaction(async (transaction) => {
      const existingRun = await transaction<ChunkingRunRow>('chunking_runs')
        .where({
          document_version_id: plan.run.documentVersionId,
          chunker_version: plan.run.chunkerVersion,
          chunking_profile: plan.run.chunkingProfile,
          tokenizer_key: plan.run.tokenizerKey,
          tokenizer_version: plan.run.tokenizerVersion,
        })
        .first();

      if (existingRun?.status === 'chunked') {
        const count = await transaction<ChunkRow>('chunks')
          .where({ chunking_run_id: existingRun.id })
          .count<{ count: string }[]>({ count: '*' });
        return {
          status: 'already_chunked',
          runId: existingRun.id,
          documentVersionId: existingRun.document_version_id,
          chunkCount: Number(count[0]?.count ?? 0),
        };
      }

      const runId = existingRun?.id ?? randomUUID();
      const runRow: ChunkingRunRow = {
        id: runId,
        document_id: plan.run.documentId,
        document_version_id: plan.run.documentVersionId,
        topic_id: plan.run.topicId,
        status: 'chunked',
        chunker_version: plan.run.chunkerVersion,
        chunking_profile: plan.run.chunkingProfile,
        tokenizer_key: plan.run.tokenizerKey,
        tokenizer_version: plan.run.tokenizerVersion,
        failure: null,
        started_at: options.now,
        completed_at: options.now,
        created_at: options.now,
        updated_at: options.now,
      };

      await transaction<ChunkingRunRow>('chunking_runs')
        .insert(runRow)
        .onConflict([
          'document_version_id',
          'chunker_version',
          'chunking_profile',
          'tokenizer_key',
          'tokenizer_version',
        ])
        .merge({
          status: runRow.status,
          failure: runRow.failure,
          started_at: runRow.started_at,
          completed_at: runRow.completed_at,
          updated_at: runRow.updated_at,
        });

      await transaction<ChunkRow>('chunks')
        .where({ chunking_run_id: runId })
        .delete();

      if (plan.chunks.length > 0) {
        await transaction<ChunkRow>('chunks').insert(
          plan.chunks.map((chunk) => ({
            id: randomUUID(),
            chunking_run_id: runId,
            document_id: chunk.documentId,
            document_version_id: chunk.documentVersionId,
            topic_id: chunk.topicId,
            frontier_entry_id: chunk.frontierEntryId,
            chunk_index: chunk.chunkIndex,
            text: chunk.text,
            normalized_text: chunk.normalizedText,
            heading_path: chunk.headingPath,
            section_title: chunk.sectionTitle,
            chunk_type: chunk.chunkType,
            chunk_type_confidence: chunk.chunkTypeConfidence,
            token_count: chunk.tokenCount,
            language: chunk.language,
            language_hints: chunk.languageHints,
            geo_hints: chunk.geoHints,
            source_metadata: chunk.sourceMetadata,
            content_hash: chunk.contentHash,
            normalized_text_hash: chunk.normalizedTextHash,
            near_duplicate_group_id: chunk.nearDuplicateGroupId,
            created_at: options.now,
          })),
        );
      }

      return {
        status: 'chunked',
        runId,
        documentVersionId: plan.run.documentVersionId,
        chunkCount: plan.chunks.length,
      };
    });
  }
}

function toDocumentVersion(row: DocumentVersionRow): DocumentVersionForChunking {
  return {
    id: row.id,
    documentId: row.document_id,
    topicId: row.topic_id,
    frontierEntryId: row.frontier_entry_id,
    topicConfigurationVersion: row.topic_configuration_version,
    requestedUrl: row.requested_url,
    finalUrl: row.final_url,
    canonicalUrl: row.canonical_url,
    title: row.title,
    metaDescription: row.meta_description,
    contentHash: row.content_hash,
    extractorVersion: row.extractor_version,
    cleanedMarkdown: row.cleaned_markdown,
    plainText: row.plain_text,
    metadata: row.metadata,
    structuredData: row.structured_data,
    languageHints: row.language_hints,
    geoHints: row.geo_hints,
    createdAt: new Date(row.created_at),
  };
}

function toChunkingRun(row: ChunkingRunRow): ChunkingRunRecord {
  return {
    id: row.id,
    documentId: row.document_id,
    documentVersionId: row.document_version_id,
    topicId: row.topic_id,
    status: row.status,
    chunkerVersion: row.chunker_version,
    chunkingProfile: row.chunking_profile,
    tokenizerKey: row.tokenizer_key,
    tokenizerVersion: row.tokenizer_version,
    failure: row.failure,
    startedAt: row.started_at ? new Date(row.started_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
