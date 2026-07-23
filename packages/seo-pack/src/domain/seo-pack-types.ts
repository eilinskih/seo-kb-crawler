export type SeoPackProfileName =
  | 'landing_page'
  | 'guide'
  | 'faq_page'
  | 'comparison_page'
  | 'local_page'
  | 'entity_page'
  | 'supporting_page'
  | 'update_existing';

export type SeoPackConfidence = 'unknown' | 'low' | 'medium' | 'high';

export type SeoPackIntentPriority =
  | 'mandatory'
  | 'recommended'
  | 'opportunity'
  | 'monitor';

export interface SeoPackGeoTarget {
  country?: string;
  region?: string;
  city?: string;
}

export interface SeoPackSourceReference {
  sourceId: string;
  sourceType: string;
  url?: string;
  title?: string;
}

export interface SeoPackInputSourcePackReference {
  packType:
    | 'knowledge_pack'
    | 'demand_pack'
    | 'serp_pack'
    | 'serp_intent_pack'
    | 'candidate_scoring_pack'
    | 'topic_expansion_pack'
    | 'long_tail_discovery_pack'
    | 'research_assets';
  packId: string;
}

export interface SeoPackKnowledgeEntityInput {
  entityId: string;
  label: string;
  type?: string;
  aliases?: string[];
  confidence?: SeoPackConfidence;
  sourceReferences?: SeoPackSourceReference[];
}

export interface SeoPackKnowledgeFactInput {
  factId: string;
  statement: string;
  entityIds?: string[];
  confidence?: SeoPackConfidence;
  sourceReferences?: SeoPackSourceReference[];
  unresolvedConflict?: boolean;
}

export interface SeoPackKnowledgePackInput {
  packId?: string;
  entities?: SeoPackKnowledgeEntityInput[];
  facts?: SeoPackKnowledgeFactInput[];
  evidenceGaps?: string[];
  summary?: string;
  warnings?: string[];
  degraded?: boolean;
}

export interface SeoPackDemandInput {
  packId?: string;
  candidateLabel?: string;
  primaryKeyword?: string;
  keywordCluster?: string[];
  demandSummary?: string;
  nullableMetricsWarning?: string;
  warnings?: string[];
  degraded?: boolean;
}

export interface SeoPackSerpHeadingInput {
  heading: string;
  frequency?: number;
  sourceReferences?: SeoPackSourceReference[];
}

export interface SeoPackSerpFaqInput {
  question: string;
  sourceReferences?: SeoPackSourceReference[];
  confidence?: SeoPackConfidence;
}

export interface SeoPackCompetitorInsightInput {
  insight: string;
  sourceReferences?: SeoPackSourceReference[];
  confidence?: SeoPackConfidence;
}

export interface SeoPackSerpInput {
  packId?: string;
  summary?: string;
  headings?: SeoPackSerpHeadingInput[];
  faqQuestions?: SeoPackSerpFaqInput[];
  competitorInsights?: SeoPackCompetitorInsightInput[];
  contentDepthExpectation?: string;
  serpFeatureHints?: string[];
  warnings?: string[];
  degraded?: boolean;
}

export interface SeoPackIntentInput {
  intentId: string;
  label: string;
  priority: SeoPackIntentPriority;
  confidence?: SeoPackConfidence;
  supportingIds?: string[];
  question?: string;
}

export interface SeoPackSerpIntentInput {
  packId?: string;
  intents?: SeoPackIntentInput[];
  warnings?: string[];
  degraded?: boolean;
}

export interface SeoPackScoredCandidateInput {
  candidateKey: string;
  label: string;
  normalizedConcept?: string;
  recommendedPageType?: SeoPackProfileName;
  opportunityScore?: number;
  confidence?: SeoPackConfidence;
  rationale?: string[];
  focusedResearchHints?: string[];
  warnings?: string[];
  degraded?: boolean;
}

export interface SeoPackCandidateScoringInput {
  packId?: string;
  scoredCandidates?: SeoPackScoredCandidateInput[];
  warnings?: string[];
  degraded?: boolean;
}

export interface SeoPackExpansionInput {
  packId?: string;
  candidateLabels?: string[];
  warnings?: string[];
  degraded?: boolean;
}

export interface SeoPackLongTailInput {
  packId?: string;
  questionCandidates?: string[];
  candidateLabels?: string[];
  warnings?: string[];
  degraded?: boolean;
}

export interface SeoPackResearchAssetInput {
  assetId: string;
  assetType: string;
  title?: string;
  sourceReferences?: SeoPackSourceReference[];
}

export interface SeoPackRequest {
  topicId: string;
  candidateKey: string;
  language?: string;
  geo?: SeoPackGeoTarget;
  profile?: SeoPackProfileName;
  knowledgePack?: SeoPackKnowledgePackInput;
  demandPack?: SeoPackDemandInput;
  serpPack?: SeoPackSerpInput;
  serpIntentPack?: SeoPackSerpIntentInput;
  candidateScoringPack?: SeoPackCandidateScoringInput;
  topicExpansionPack?: SeoPackExpansionInput;
  longTailDiscoveryPack?: SeoPackLongTailInput;
  researchAssets?: SeoPackResearchAssetInput[];
  sourcePackReferences?: SeoPackInputSourcePackReference[];
  warnings?: string[];
  degraded?: boolean;
  ruleVersion?: string;
}

export interface SeoPackPageBrief {
  titleConcept: string;
  targetAudience: string | null;
  primaryIntent: string | null;
  secondaryIntents: string[];
  candidateRationale: string[];
  demandSummary: string | null;
  serpSummary: string | null;
  knowledgeSummary: string | null;
  evidenceGaps: string[];
  nonGoals: string[];
}

export interface SeoPackOutlineSection {
  sectionKey: string;
  headingSuggestion: string;
  purpose: string;
  mappedIntentIds: string[];
  requiredEntityIds: string[];
  requiredFactIds: string[];
  sourceReferences: SeoPackSourceReference[];
  confidence: SeoPackConfidence;
  warnings: string[];
}

export interface SeoPackFaqRecommendation {
  question: string;
  intentId: string | null;
  priority: SeoPackIntentPriority;
  requiredFactIds: string[];
  sourceReferences: SeoPackSourceReference[];
  confidence: SeoPackConfidence;
  unresolvedEvidenceGaps: string[];
}

export interface SeoPackRequiredEntity {
  entityId: string;
  label: string;
  type: string | null;
  aliases: string[];
  confidence: SeoPackConfidence;
  sourceReferences: SeoPackSourceReference[];
}

export interface SeoPackRequiredFact {
  factId: string;
  statement: string;
  entityIds: string[];
  confidence: SeoPackConfidence;
  sourceReferences: SeoPackSourceReference[];
  unresolvedConflict: boolean;
  requiresMoreResearch: boolean;
}

export interface SeoPackSerpRequirement {
  requirementKey: string;
  label: string;
  priority: SeoPackIntentPriority;
  confidence: SeoPackConfidence;
  sourceReferences: SeoPackSourceReference[];
  warnings: string[];
}

export interface SeoPackCompetitorInsight {
  insight: string;
  confidence: SeoPackConfidence;
  sourceReferences: SeoPackSourceReference[];
}

export interface SeoPackInternalLinkingHint {
  sourcePageCandidate: string | null;
  targetPageCandidate: string | null;
  anchorConcept: string;
  relatedEntityIds: string[];
  relatedTopicIds: string[];
  confidence: SeoPackConfidence;
  reason: string;
}

export interface SeoPackGenerationConstraint {
  code:
    | 'cite_required_fact'
    | 'do_not_assert_weak_fact'
    | 'cover_required_intent'
    | 'consider_opportunity_intent'
    | 'avoid_unsupported_claim'
    | 'resolve_conflict_before_claim'
    | 'respect_language_geo'
    | 'include_source_reference';
  detail: string;
  sourceIds: string[];
  blocking: boolean;
}

export interface SeoPackUncertainty {
  evidenceGaps: string[];
  unresolvedConflicts: string[];
  weakEvidenceWarnings: string[];
  missingPackWarnings: string[];
}

export interface SeoPack {
  packKey: string;
  topicId: string;
  candidateKey: string;
  pageType: SeoPackProfileName;
  language?: string;
  geo?: SeoPackGeoTarget;
  pageBrief: SeoPackPageBrief;
  recommendedOutline: SeoPackOutlineSection[];
  faqRecommendations: SeoPackFaqRecommendation[];
  requiredEntities: SeoPackRequiredEntity[];
  requiredFacts: SeoPackRequiredFact[];
  mandatorySerpIntents: SeoPackSerpRequirement[];
  opportunityIntents: SeoPackSerpRequirement[];
  serpExpectations: SeoPackSerpRequirement[];
  competitorInsights: SeoPackCompetitorInsight[];
  internalLinkingHints: SeoPackInternalLinkingHint[];
  generationConstraints: SeoPackGenerationConstraint[];
  sourceReferences: SeoPackSourceReference[];
  uncertainty: SeoPackUncertainty;
  warnings: string[];
  degraded: boolean;
  sourcePackReferences: SeoPackInputSourcePackReference[];
  ruleVersion: string;
}
