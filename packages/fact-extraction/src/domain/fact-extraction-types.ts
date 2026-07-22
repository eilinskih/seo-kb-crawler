import { ChunkType } from '@seo-kb/chunking';
import { DocumentMetadata, GeoHint } from '@seo-kb/content-processing';
import {
  CanonicalFactRecord,
  PredicateAliasResolution,
  RawFactRecord,
} from '@seo-kb/ontology';

export type FactExtractionRunStatus =
  | 'pending'
  | 'extracting'
  | 'completed'
  | 'skipped'
  | 'failed_retryable'
  | 'failed_terminal';

export type FactExtractionFailureCategory =
  | 'provider_unavailable'
  | 'provider_error'
  | 'low_value_chunk'
  | 'invalid_candidate'
  | 'normalization_error'
  | 'database_error'
  | 'internal_error';

export interface FactExtractionFailure {
  category: FactExtractionFailureCategory;
  detail: string;
  retryable: boolean;
}

export interface FactExtractionProviderIdentity {
  providerKey: string;
  modelKey: string;
  modelVersion: string;
}

export interface FactExtractionProfile {
  key: string;
  version: string;
  minChunkTokens: number;
  minCandidateConfidence: number;
  minCanonicalConfidence: number;
}

export interface FactExtractionJob {
  jobId: string;
  chunkIds: string[];
  providerKey: string;
  modelKey: string;
  modelVersion: string;
  profileKey: string;
  profileVersion: string;
  requestedAt: string;
  reason: 'new_chunk' | 'profile_changed' | 'model_changed' | 'manual';
}

export interface ChunkForFactExtraction {
  id: string;
  chunkingRunId: string;
  documentId: string;
  documentVersionId: string;
  topicId: string;
  text: string;
  headingPath: string[];
  sectionTitle: string | null;
  chunkType: ChunkType;
  tokenCount: number;
  language: string | null;
  geoHints: GeoHint[];
  sourceMetadata: {
    requestedUrl: string;
    finalUrl: string | null;
    canonicalUrl: string | null;
    pageTitle: string | null;
    metaDescription: string | null;
  };
  documentMetadata: DocumentMetadata | null;
  contentHash: string;
  normalizedTextHash: string;
}

export interface TopicClassificationContext {
  primaryKind: string;
  secondaryKinds: string[];
  confidence: number;
}

export interface KnownEntityHint {
  entityId: string;
  canonicalName: string;
  entityType: string;
  aliases: string[];
  confidence: number;
}

export interface FactExtractionCandidateDecision {
  chunkId: string;
  selected: boolean;
  priority: number;
  reasons: string[];
  skippedReason?: string;
}

export interface FactExtractionProviderInput {
  chunk: ChunkForFactExtraction;
  knownEntities: KnownEntityHint[];
  topicClassification: TopicClassificationContext | null;
  profile: FactExtractionProfile;
}

export interface RawFactCandidate {
  subjectEntityId?: string;
  subjectCandidate?: string;
  objectCandidate: unknown;
  predicateCandidate: string;
  attributesCandidate: Record<string, unknown>;
  confidence: number;
  fieldConfidence?: Record<string, number>;
  evidenceText?: string;
}

export interface FactExtractionProviderResult {
  candidates: RawFactCandidate[];
}

export interface FactExtractionRunIdentity {
  chunkId: string;
  documentVersionId: string;
  profileKey: string;
  profileVersion: string;
  providerKey: string;
  modelKey: string;
  modelVersion: string;
  chunkContentHash: string;
}

export interface FactExtractionRunRecord extends FactExtractionRunIdentity {
  id: string;
  topicId: string;
  documentId: string;
  status: FactExtractionRunStatus;
  failure: FactExtractionFailure | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RawFactForStorage
  extends Omit<
    RawFactRecord,
    'id' | 'extractionModel' | 'status' | 'normalizationNotes' | 'createdAt' | 'updatedAt'
  > {
  extractionRunId: string;
  sourceDocumentVersionId: string;
  extractionModel: FactExtractionProviderIdentity;
  fieldConfidence: Record<string, number>;
  evidenceText: string | null;
}

export interface StoredRawFactRecord extends RawFactRecord {
  extractionRunId: string;
  sourceDocumentVersionId: string;
  fieldConfidence: Record<string, number>;
  evidenceText: string | null;
}

export interface CanonicalFactForStorage
  extends Omit<CanonicalFactRecord, 'id' | 'createdAt' | 'updatedAt'> {
  sourceDocumentVersionId: string;
}

export interface StoredCanonicalFactRecord extends CanonicalFactRecord {
  sourceDocumentVersionId: string;
}

export interface FactNormalizationAttemptRecord {
  id: string;
  rawFactId: string | null;
  extractionRunId: string;
  predicateResolutionStatus: PredicateAliasResolution['status'];
  predicateId: string | null;
  predicateAliasId: string | null;
  canonicalFactId: string | null;
  rejectionReason: string | null;
  createdAt: Date;
}

export interface FactNormalizationAttemptForStorage
  extends Omit<
    FactNormalizationAttemptRecord,
    'id' | 'rawFactId' | 'canonicalFactId' | 'createdAt'
  > {
  rawFactIndex: number | null;
  canonicalFactIndex: number | null;
}

export interface FactExtractionResult {
  status:
    | 'completed'
    | 'already_processed'
    | 'skipped'
    | 'provider_unavailable'
    | 'failed';
  runId: string;
  rawFactCount: number;
  canonicalFactCount: number;
  rejectedCount: number;
}

export interface FactExtractionRepository {
  findExtractionCandidates(options: {
    limit: number;
    profile: FactExtractionProfile;
    provider: FactExtractionProviderIdentity;
  }): Promise<ChunkForFactExtraction[]>;
  findChunksByIds(chunkIds: string[]): Promise<ChunkForFactExtraction[]>;
  findRun(identity: FactExtractionRunIdentity): Promise<FactExtractionRunRecord | null>;
  startRun(
    chunk: ChunkForFactExtraction,
    identity: FactExtractionRunIdentity,
    options: {
      now: Date;
    },
  ): Promise<FactExtractionRunRecord>;
  markRunSkipped(
    run: FactExtractionRunRecord,
    failure: FactExtractionFailure,
    options: {
      now: Date;
    },
  ): Promise<void>;
  markRunFailed(
    run: FactExtractionRunRecord,
    failure: FactExtractionFailure,
    options: {
      now: Date;
    },
  ): Promise<void>;
  saveExtractionOutcome(
    run: FactExtractionRunRecord,
    outcome: {
      rawFacts: RawFactForStorage[];
      canonicalFacts: CanonicalFactForStorage[];
      normalizationAttempts: FactNormalizationAttemptForStorage[];
    },
    options: {
      now: Date;
    },
  ): Promise<FactExtractionResult>;
}
