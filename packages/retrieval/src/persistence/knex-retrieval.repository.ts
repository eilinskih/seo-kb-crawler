import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  RetrievalCandidate,
  RetrievalQuery,
  RetrievalReadinessSummary,
  RetrievalRepository,
} from '../domain/retrieval-types';

const OVERFETCH_FOR_RANKING_MULTIPLIER = 3;

interface RetrievalRow {
  chunk_id: string;
  document_id: string;
  document_version_id: string;
  topic_id: string;
  text: string;
  normalized_text: string;
  heading_path: string[];
  section_title: string | null;
  chunk_type: RetrievalCandidate['chunkType'];
  language: string | null;
  geo_hints: RetrievalCandidate['geoHints'];
  content_hash: string;
  normalized_text_hash: string;
  source_metadata: {
    requestedUrl: string;
    finalUrl: string | null;
    canonicalUrl: string | null;
    sourceDomain: string | null;
  };
  vector_score?: string | number;
}

@Injectable()
export class KnexRetrievalRepository implements RetrievalRepository {
  constructor(private readonly db: DbService) {}

  async searchVector(query: RetrievalQuery): Promise<RetrievalCandidate[]> {
    if (!query.queryVector || query.queryVector.length === 0) {
      return [];
    }

    let builder = this.baseQuery(query)
      .join(
        'chunk_embeddings',
        'chunks.id',
        'chunk_embeddings.chunk_id',
      )
      .where('chunk_embeddings.status', 'embedded')
      .whereNotNull('chunk_embeddings.vector')
      .select(
        this.db.knex.raw(
          '1 - (chunk_embeddings.vector <=> ?::vector) as vector_score',
          [formatVector(query.queryVector)],
        ),
      )
      .orderByRaw('chunk_embeddings.vector <=> ?::vector ASC', [
        formatVector(query.queryVector),
      ])
      .limit(overfetchLimit(query));

    if (query.embeddingModelId) {
      builder = builder.where(
        'chunk_embeddings.embedding_model_id',
        query.embeddingModelId,
      );
    }

    const rows = await builder as unknown as RetrievalRow[];
    return rows.map((row) => toCandidate(row, query, 'vector'));
  }

  async searchKeyword(query: RetrievalQuery): Promise<RetrievalCandidate[]> {
    if (!query.query.trim()) {
      return [];
    }

    const rows = await this.baseQuery(query)
      .where((builder) => {
        for (const term of terms(query.query)) {
          const pattern = `%${escapeLike(term)}%`;
          builder.orWhereRaw(
            "chunks.text ILIKE ? ESCAPE '\\'",
            [pattern],
          )
            .orWhereRaw(
              "chunks.heading_path::text ILIKE ? ESCAPE '\\'",
              [pattern],
            )
            .orWhereRaw(
              "chunks.section_title ILIKE ? ESCAPE '\\'",
              [pattern],
            );
        }
      })
      .limit(overfetchLimit(query)) as unknown as RetrievalRow[];

    return rows.map((row) => toCandidate(row, query, 'keyword'));
  }

  async searchMetadata(query: RetrievalQuery): Promise<RetrievalCandidate[]> {
    const rows = await this.baseQuery(query).limit(
      overfetchLimit(query),
    ) as unknown as RetrievalRow[];
    return rows.map((row) => toCandidate(row, query, 'metadata'));
  }

  async summarizeReadiness(): Promise<RetrievalReadinessSummary> {
    const chunkRows = await this.db.knex('chunks')
      .count({ count: '*' }) as Array<{ count: string | number }>;
    const embeddedRows = await this.db.knex('chunk_embeddings')
      .where('status', 'embedded')
      .countDistinct({ count: 'chunk_id' }) as Array<{ count: string | number }>;
    const totalChunks = Number(chunkRows[0]?.count ?? 0);
    const embeddedChunks = Number(embeddedRows[0]?.count ?? 0);

    return {
      totalChunks,
      embeddedChunks,
      keywordReady: totalChunks > 0,
      vectorReady: embeddedChunks > 0,
      degradedMode: totalChunks > 0 && embeddedChunks === 0,
    };
  }

  private baseQuery(query: RetrievalQuery) {
    let builder = this.db.knex<RetrievalRow>('chunks')
      .select([
        'chunks.id as chunk_id',
        'chunks.document_id',
        'chunks.document_version_id',
        'chunks.topic_id',
        'chunks.text',
        'chunks.normalized_text',
        'chunks.heading_path',
        'chunks.section_title',
        'chunks.chunk_type',
        'chunks.language',
        'chunks.geo_hints',
        'chunks.content_hash',
        'chunks.normalized_text_hash',
        'chunks.source_metadata',
      ])
      .orderBy('chunks.created_at', 'desc');

    if (query.topicId) {
      builder = builder.where('chunks.topic_id', query.topicId);
    }
    if (query.language) {
      builder = builder.where('chunks.language', query.language);
    }
    if (query.chunkTypes && query.chunkTypes.length > 0) {
      builder = builder.whereIn('chunks.chunk_type', query.chunkTypes);
    }
    if (query.sourceDomains && query.sourceDomains.length > 0) {
      builder = builder.whereRaw(
        "chunks.source_metadata ->> 'sourceDomain' = ANY(?)",
        [query.sourceDomains],
      );
    }

    return builder;
  }
}

function toCandidate(
  row: RetrievalRow,
  query: RetrievalQuery,
  mode: 'vector' | 'keyword' | 'metadata',
): RetrievalCandidate {
  const matchedTerms = terms(query.query).filter((term) =>
    `${row.text} ${row.heading_path.join(' ')} ${row.section_title ?? ''}`
      .toLowerCase()
      .includes(term),
  );

  return {
    chunkId: row.chunk_id,
    documentId: row.document_id,
    documentVersionId: row.document_version_id,
    topicId: row.topic_id,
    text: row.text,
    language: row.language,
    geoHints: row.geo_hints,
    sourceUrl:
      row.source_metadata.finalUrl ??
      row.source_metadata.canonicalUrl ??
      row.source_metadata.requestedUrl,
    canonicalUrl: row.source_metadata.canonicalUrl,
    sourceDomain: row.source_metadata.sourceDomain,
    headingPath: row.heading_path,
    sectionTitle: row.section_title,
    chunkType: row.chunk_type,
    contentHash: row.content_hash,
    normalizedTextHash: row.normalized_text_hash,
    vectorScore: mode === 'vector' ? Number(row.vector_score ?? 0) : 0,
    keywordScore: mode === 'keyword' ? keywordScore(query, matchedTerms) : 0,
    metadataScore: mode === 'metadata' ? 1 : 0,
    matchedTerms,
    modes: [mode],
  };
}

function keywordScore(query: RetrievalQuery, matchedTerms: string[]): number {
  const queryTerms = terms(query.query);
  return queryTerms.length === 0 ? 0 : matchedTerms.length / queryTerms.length;
}

function terms(query: string): string[] {
  return query.toLowerCase().split(/\s+/u).filter(Boolean);
}

function overfetchLimit(query: RetrievalQuery): number {
  return query.limit * OVERFETCH_FOR_RANKING_MULTIPLIER;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/gu, (match) => `\\${match}`);
}

function formatVector(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
