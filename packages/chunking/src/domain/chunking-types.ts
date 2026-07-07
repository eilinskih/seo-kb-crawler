import {
  DocumentMetadata,
  GeoHint,
  HeadingObservation,
  LanguageHint,
  StructuredDataObservation,
} from '@seo-kb/content-processing';

export type ChunkingRunStatus =
  | 'pending'
  | 'chunking'
  | 'chunked'
  | 'failed_retryable'
  | 'failed_terminal';

export type ChunkingProfile =
  | 'short_seo_page'
  | 'long_guide'
  | 'review'
  | 'forum'
  | 'default';

export type ChunkType =
  | 'intro'
  | 'section'
  | 'guide'
  | 'review'
  | 'faq'
  | 'table'
  | 'list'
  | 'comparison'
  | 'local_section'
  | 'conclusion'
  | 'unknown';

export type ChunkTypeConfidence = 'high' | 'medium' | 'low' | 'unknown';

export type ChunkingFailureCategory =
  | 'missing_usable_text'
  | 'unsupported_document_artifact'
  | 'malformed_input'
  | 'tokenizer_error'
  | 'database_error'
  | 'internal_error';

export interface ChunkingFailure {
  category: ChunkingFailureCategory;
  detail: string;
  retryable: boolean;
}

export interface ChunkingProfileConfiguration {
  profile: ChunkingProfile;
  minTokens: number;
  maxTokens: number;
  overlapTokens: number;
  allowOverlapAcrossHeadings: boolean;
  preserveLists: boolean;
  preserveTables: boolean;
  preserveFaqPairs: boolean;
}

export interface ChunkingRunIdentity {
  documentVersionId: string;
  chunkerVersion: string;
  chunkingProfile: ChunkingProfile;
  tokenizerKey: string;
  tokenizerVersion: string;
}

export interface DocumentVersionForChunking {
  id: string;
  documentId: string;
  topicId: string;
  frontierEntryId: string;
  topicConfigurationVersion: number;
  requestedUrl: string;
  finalUrl: string | null;
  canonicalUrl: string | null;
  title: string | null;
  metaDescription: string | null;
  contentHash: string | null;
  extractorVersion: string;
  cleanedMarkdown: string | null;
  plainText: string | null;
  metadata: DocumentMetadata;
  structuredData: StructuredDataObservation[];
  languageHints: LanguageHint[];
  geoHints: GeoHint[];
  createdAt: Date;
}

export interface ChunkTypeClassification {
  type: ChunkType;
  confidence: ChunkTypeConfidence;
}

export interface ChunkRecord {
  id: string;
  chunkingRunId: string;
  documentId: string;
  documentVersionId: string;
  topicId: string;
  frontierEntryId: string;
  chunkIndex: number;
  text: string;
  normalizedText: string;
  headingPath: string[];
  sectionTitle: string | null;
  chunkType: ChunkType;
  chunkTypeConfidence: ChunkTypeConfidence;
  tokenCount: number;
  language: string | null;
  languageHints: LanguageHint[];
  geoHints: GeoHint[];
  sourceMetadata: ChunkSourceMetadata;
  contentHash: string;
  normalizedTextHash: string;
  nearDuplicateGroupId: string | null;
  createdAt: Date;
}

export interface ChunkSourceMetadata {
  requestedUrl: string;
  finalUrl: string | null;
  canonicalUrl: string | null;
  pageTitle: string | null;
  metaDescription: string | null;
  topicConfigurationVersion: number;
  extractorVersion: string;
  documentContentHash: string | null;
  inputQuality: 'markdown' | 'plain_text';
}

export interface ChunkingRunRecord {
  id: string;
  documentId: string;
  documentVersionId: string;
  topicId: string;
  status: ChunkingRunStatus;
  chunkerVersion: string;
  chunkingProfile: ChunkingProfile;
  tokenizerKey: string;
  tokenizerVersion: string;
  failure: ChunkingFailure | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChunkingPlan {
  run: Omit<ChunkingRunRecord, 'id' | 'status' | 'failure' | 'startedAt' | 'completedAt' | 'createdAt' | 'updatedAt'>;
  chunks: Omit<ChunkRecord, 'id' | 'chunkingRunId' | 'createdAt'>[];
}

export interface ChunkingResult {
  status: 'chunked' | 'already_chunked';
  runId: string;
  documentVersionId: string;
  chunkCount: number;
}

export interface ChunkingRepository {
  findDocumentVersion(
    documentVersionId: string,
  ): Promise<DocumentVersionForChunking | null>;
  findRun(identity: ChunkingRunIdentity): Promise<ChunkingRunRecord | null>;
  saveChunkingPlan(
    plan: ChunkingPlan,
    options: {
      now: Date;
    },
  ): Promise<ChunkingResult>;
}
