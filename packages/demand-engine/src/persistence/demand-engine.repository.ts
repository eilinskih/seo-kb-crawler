import {
  CandidatePage,
  DemandDiscoveryResult,
  DemandMetricSnapshot,
  DemandObservation,
  KeywordCandidate,
} from '../domain/demand-engine-types';

export interface SaveDemandDiscoveryResultCommand {
  result: DemandDiscoveryResult;
  topicId?: string;
  observedAt: string;
}

export interface MarkCandidatePagesSerpValidatedCommand {
  topicId: string;
  validations: Array<{
    query: string;
    evidenceUrls: string[];
  }>;
  validatedAt: string;
}

export interface ApplyPhraseAnalysisToKeywordCandidateCommand {
  keywordCandidateId: string;
  candidateUpdatedAt: string;
  phraseAnalysis: NonNullable<KeywordCandidate['phraseAnalysis']>;
  externalEntityAttemptId?: string | null;
  appliedAt: string;
}

export interface DemandKeywordCandidateRecord extends KeywordCandidate {
  id: string;
  topicId: string | null;
  lastObservedAt: string;
  phraseAnalysisUpdatedAt?: string | null;
  phraseAnalysisAttemptId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DemandObservationRecord extends DemandObservation {
  id: string;
  keywordCandidateId: string;
  topicId: string | null;
  observedAt: string;
  createdAt: string;
}

export interface DemandMetricSnapshotRecord extends DemandMetricSnapshot {
  id: string;
  keywordCandidateId: string;
  topicId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DemandCandidatePageRecord extends CandidatePage {
  id: string;
  keywordCandidateId: string;
  topicId: string | null;
  phraseAnalysisUpdatedAt?: string | null;
  phraseAnalysisAttemptId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DemandDiscoveryPersistenceResult {
  keywordCandidates: DemandKeywordCandidateRecord[];
  observations: DemandObservationRecord[];
  metricSnapshots: DemandMetricSnapshotRecord[];
  candidatePages: DemandCandidatePageRecord[];
}

export interface DemandEngineRepository {
  saveDiscoveryResult(
    command: SaveDemandDiscoveryResultCommand,
  ): Promise<DemandDiscoveryPersistenceResult>;
  markCandidatePagesSerpValidated(
    command: MarkCandidatePagesSerpValidatedCommand,
  ): Promise<DemandCandidatePageRecord[]>;
  findKeywordCandidateById(
    keywordCandidateId: string,
  ): Promise<DemandKeywordCandidateRecord | null>;
  applyPhraseAnalysisToKeywordCandidate(
    command: ApplyPhraseAnalysisToKeywordCandidateCommand,
  ): Promise<DemandKeywordCandidateRecord | null>;
  listKeywordCandidates(topicId: string): Promise<DemandKeywordCandidateRecord[]>;
  listCandidatePages(topicId: string): Promise<DemandCandidatePageRecord[]>;
}
