export type SourceType =
  | 'official_documentation'
  | 'government'
  | 'manufacturer'
  | 'vendor'
  | 'news'
  | 'wiki_reference'
  | 'forum_community'
  | 'user_generated'
  | 'marketplace'
  | 'affiliate'
  | 'unknown';

export type SourceReviewStatus =
  | 'inferred'
  | 'reviewed'
  | 'overridden'
  | 'deprecated';

export type ScoredItemType = 'fact' | 'entity';

export interface TrustAdjustment {
  key: string;
  value: number;
  reason: string;
}

export interface ScoreComponents {
  baseScore: number;
  adjustments: TrustAdjustment[];
  finalScore: number;
}

export interface SourceClassificationInput {
  sourceUrl: string;
  canonicalUrl?: string | null;
  sourceDomain?: string | null;
  title?: string | null;
  structuredDataTypes?: string[];
  reviewedSourceType?: SourceType;
}

export interface SourceClassification {
  sourceType: SourceType;
  confidence: number;
  matchedRules: string[];
}

export interface SourceTrustInput extends SourceClassificationInput {
  classification?: SourceClassification;
  reviewedScore?: number;
  reviewStatus?: SourceReviewStatus;
  metadataComplete?: boolean;
  warnings?: string[];
  ruleVersion?: string;
}

export interface SourceTrustScore {
  sourceUrl: string;
  canonicalUrl: string | null;
  sourceDomain: string | null;
  sourceType: SourceType;
  reviewStatus: SourceReviewStatus;
  ruleVersion: string;
  components: ScoreComponents;
  score: number;
}

export interface EvidenceAggregationInput {
  itemId: string;
  itemType: ScoredItemType;
  chunkIds: string[];
  documentIds: string[];
  sourceDomains: Array<string | null>;
  sourceTrustScores: number[];
  possibleConflict?: boolean;
}

export interface EvidenceStrengthScore {
  itemId: string;
  itemType: ScoredItemType;
  supportingChunkCount: number;
  supportingDocumentCount: number;
  supportingDomainCount: number;
  averageSourceTrust: number | null;
  components: ScoreComponents;
  score: number;
  uncertaintyFlags: string[];
}

export interface FactScoreInput {
  factId: string;
  extractionConfidence: number;
  normalizationConfidence?: number | null;
  evidenceStrength: EvidenceStrengthScore;
  sourceTrustScore: number | null;
  uncertaintyFlags?: string[];
}

export interface FactTrustScore {
  factId: string;
  extractionConfidence: number;
  normalizationConfidence: number | null;
  evidenceStrengthScore: number;
  sourceTrustScore: number | null;
  finalConfidence: number;
  uncertaintyFlags: string[];
  components: Record<string, number | null>;
}

export interface EntityScoreInput {
  entityId: string;
  entityConfidence: number;
  aliasConfidences: number[];
  mentionCount: number;
  supportingDocumentCount: number;
  supportingDomainCount: number;
  averageSourceTrust: number | null;
}

export interface EntityTrustScore {
  entityId: string;
  entityConfidence: number;
  aliasConfidence: number | null;
  mentionCount: number;
  sourceDiversityScore: number;
  averageSourceTrust: number | null;
  finalConfidence: number;
  components: Record<string, number | null>;
}

export interface SourceProfileForStorage extends SourceTrustScore {
  id?: string;
}

export interface SourceTrustScoreForStorage extends SourceTrustScore {
  id?: string;
  sourceProfileId?: string | null;
  inputSignals: Record<string, unknown>;
}

export interface EvidenceLinkForStorage {
  id?: string;
  canonicalFactId?: string | null;
  entityId?: string | null;
  chunkId: string;
  documentId: string;
  documentVersionId: string;
  sourceProfileId?: string | null;
  evidenceRole: string;
  confidence?: number | null;
  provenance: Record<string, unknown>;
}

export interface FactScoreForStorage extends FactTrustScore {
  id?: string;
  ruleVersion: string;
}

export interface EntityScoreForStorage extends EntityTrustScore {
  id?: string;
  ruleVersion: string;
}

export interface SourceTrustRepository {
  saveSourceProfile(profile: SourceProfileForStorage): Promise<string>;
  saveSourceTrustScore(score: SourceTrustScoreForStorage): Promise<string>;
  saveEvidenceLink(link: EvidenceLinkForStorage): Promise<string>;
  saveFactScore(score: FactScoreForStorage): Promise<string>;
  saveEntityScore(score: EntityScoreForStorage): Promise<string>;
}

export class SourceTrustValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceTrustValidationError';
  }
}
