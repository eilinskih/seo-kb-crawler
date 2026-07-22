export type ComparableValueKind =
  | 'number'
  | 'range'
  | 'boolean'
  | 'category'
  | 'string'
  | 'comparison_deferred';

export type ConsensusConfidenceLevel = 'unknown' | 'weak' | 'moderate' | 'strong';

export type ConflictSeverity = 'none' | 'low' | 'medium' | 'high';

export type SeoPhrasingHintType =
  | 'confident'
  | 'cautious'
  | 'comparison'
  | 'avoid_claim'
  | 'needs_evidence';

export interface ComparableValue {
  comparableKey: string;
  kind: ComparableValueKind;
  fingerprint: string;
  summary: string;
  rawValue: unknown;
}

export interface FactForConsensus {
  factId: string;
  subjectEntityId: string;
  predicateId: string;
  normalizedAttributes: Record<string, unknown>;
  supportingChunkIds: string[];
  sourceDomains: Array<string | null>;
  sourceTrustScore?: number | null;
  evidenceStrengthScore?: number | null;
}

export interface ConsensusAlternative {
  value: ComparableValue;
  factIds: string[];
  supportingChunkCount: number;
  supportingDomainCount: number;
  averageSourceTrust: number | null;
  averageEvidenceStrength: number | null;
  supportScore: number;
}

export interface ConsensusGroup {
  groupKey: string;
  subjectEntityId: string;
  predicateId: string;
  comparableKey: string;
  alternatives: ConsensusAlternative[];
  strongestAlternative: ConsensusAlternative | null;
  factCount: number;
  supportingChunkCount: number;
  supportingDomainCount: number;
  confidenceLevel: ConsensusConfidenceLevel;
}

export interface ConflictSet {
  conflictKey: string;
  groupKey: string;
  subjectEntityId: string;
  predicateId: string;
  comparableKey: string;
  alternatives: ConsensusAlternative[];
  severity: ConflictSeverity;
  suggestedHandling: 'compare_values' | 'phrase_cautiously' | 'avoid_claim';
}

export interface SeoPhrasingHint {
  targetType: 'consensus_group' | 'conflict_set';
  targetKey: string;
  hintType: SeoPhrasingHintType;
  message: string;
  payload: Record<string, unknown>;
}

export interface ContentGapHint {
  targetKey: string;
  gapType: 'weak_support' | 'comparison_deferred' | 'missing_evidence';
  reason: string;
  suggestedAngle: string;
}

export interface ConsensusGroupForStorage extends ConsensusGroup {
  id?: string;
  status: 'active' | 'superseded';
  ruleVersion: string;
}

export interface ConflictSetForStorage extends ConflictSet {
  id?: string;
  status: 'active' | 'resolved' | 'deprecated';
  ruleVersion: string;
}

export interface SeoPhrasingHintForStorage extends SeoPhrasingHint {
  id?: string;
  ruleVersion: string;
}

export interface ContentGapHintForStorage extends ContentGapHint {
  id?: string;
  ruleVersion: string;
}

export interface SeoConsensusRepository {
  saveConsensusGroup(group: ConsensusGroupForStorage): Promise<string>;
  saveConflictSet(conflict: ConflictSetForStorage): Promise<string>;
  saveSeoPhrasingHint(hint: SeoPhrasingHintForStorage): Promise<string>;
  saveContentGapHint(hint: ContentGapHintForStorage): Promise<string>;
}

export class SeoConsensusValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeoConsensusValidationError';
  }
}
