import { ResearchDispatchPlan } from '@seo-kb/research-scheduling';
import {
  SeoPack,
  SeoPackGenerationConstraint,
  SeoPackGeoTarget,
  SeoPackInputSourcePackReference,
  SeoPackProfileName,
  SeoPackRequiredEntity,
  SeoPackRequiredFact,
  SeoPackSerpRequirement,
  SeoPackSourceReference,
} from '@seo-kb/seo-pack';

export type SeoGenerationObjective =
  | 'page_generation'
  | 'page_brief_generation'
  | 'content_cluster_planning'
  | 'faq_generation'
  | 'comparison_page_generation'
  | 'local_seo_page_generation'
  | 'content_plan_generation';

export type SeoAgentGatewayFallbackState = 'complete' | 'degraded' | 'blocked';

export type RetrievalOnlySafeguardStatus =
  | 'structured_context_available'
  | 'supplemental_context_only'
  | 'blocked_raw_retrieval_only';

export interface SeoAgentGatewayRequest {
  topicId: string;
  query: string;
  objective: SeoGenerationObjective;
  pageType?: SeoPackProfileName;
  language?: string;
  geo?: SeoPackGeoTarget;
  candidateKey?: string;
  targetModelFamily?: string;
  consumerKey?: string;
  forceResearch?: boolean;
  sourcePackReferences?: SeoPackInputSourcePackReference[];
  createdAt?: string;
}

export interface FocusedResearchRequirement {
  required: true;
  requested: boolean;
  researchJobKey: string | null;
  status: 'required' | 'requested' | 'satisfied' | 'degraded';
  warnings: string[];
}

export interface GatewayContextRequirements {
  requiresFocusedResearch: true;
  requiredPackTypes: SeoPackInputSourcePackReference['packType'][];
  optionalPackTypes: SeoPackInputSourcePackReference['packType'][];
  minimumStructuredContext: 'seo_pack_or_structured_fallback';
}

export interface GatewayConsumerAdapter {
  consumerKey: string;
  supportedObjectives: SeoGenerationObjective[];
  supportedContextVersion: string;
  maxContextSizeHint?: number;
}

export interface GatewayContextInput {
  request: SeoAgentGatewayRequest;
  seoPack?: SeoPack;
  researchDispatchPlan?: ResearchDispatchPlan;
  contextPackAvailable?: boolean;
  contextPackWarnings?: string[];
  consumerAdapters?: GatewayConsumerAdapter[];
  missingPackWarnings?: string[];
  blocked?: boolean;
}

export type SeoAgentPromptMessageRole = 'system' | 'user' | 'assistant';

export interface SeoAgentPromptMessage {
  role: SeoAgentPromptMessageRole;
  content: string;
}

export interface SeoAgentPrompt {
  promptKey: string;
  gatewayRequestKey: string;
  messages: SeoAgentPromptMessage[];
  requiredPackReferences: SeoPackInputSourcePackReference[];
  blocked: boolean;
  warnings: string[];
  ruleVersion: string;
}

export interface SeoAgentGenerationRuntimeInput extends GatewayContextInput {
  providerKey?: string;
  modelFamily?: string;
}

export interface SeoAgentProviderRequest {
  providerKey: string;
  modelFamily?: string;
  request: SeoAgentGatewayRequest;
  context: SeoAgentGenerationContext;
  prompt: SeoAgentPrompt;
}

export type SeoAgentProviderFinishReason =
  | 'stop'
  | 'length'
  | 'content_filter'
  | 'error'
  | 'unknown';

export interface SeoAgentProviderUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface SeoAgentProviderResult {
  providerKey: string;
  modelFamily?: string;
  content: string | null;
  finishReason: SeoAgentProviderFinishReason;
  usage?: SeoAgentProviderUsage;
  auditMetadata: Record<string, string | number | boolean | null>;
  warnings: string[];
  degraded: boolean;
  generatedAt: string;
}

export interface SeoAgentGenerationProvider {
  readonly providerKey: string;
  generate(request: SeoAgentProviderRequest): Promise<SeoAgentProviderResult>;
}

export type SeoAgentGenerationRuntimeStatus =
  | 'generated'
  | 'degraded'
  | 'blocked';

export interface SeoAgentGenerationRuntimeResult {
  gatewayResult: SeoAgentGatewayResult;
  prompt: SeoAgentPrompt;
  providerResult: SeoAgentProviderResult | null;
  finalContent: string | null;
  status: SeoAgentGenerationRuntimeStatus;
  warnings: string[];
  degraded: boolean;
  generatedAt: string;
}

export interface GatewayResearchAssetsSummary {
  focusedResearchJobKey: string | null;
  dispatchTargets: string[];
  freshnessWarnings: string[];
  assetMetricTypes: string[];
}

export interface SeoAgentGenerationContext {
  gatewayRequestKey: string;
  topicId: string;
  query: string;
  language?: string;
  geo?: SeoPackGeoTarget;
  objective: SeoGenerationObjective;
  pageType?: SeoPackProfileName;
  focusedResearch: FocusedResearchRequirement;
  requiredPackReferences: SeoPackInputSourcePackReference[];
  researchAssets: GatewayResearchAssetsSummary;
  entities: SeoPackRequiredEntity[];
  facts: SeoPackRequiredFact[];
  coreIntents: SeoPackSerpRequirement[];
  opportunityIntents: SeoPackSerpRequirement[];
  serpPatterns: string[];
  serpExpectations: SeoPackSerpRequirement[];
  faq: string[];
  sources: SeoPackSourceReference[];
  generationConstraints: SeoPackGenerationConstraint[];
  uncertainty: {
    evidenceGaps: string[];
    unresolvedConflicts: string[];
    weakEvidenceWarnings: string[];
    missingPackWarnings: string[];
  };
  retrievalOnlySafeguard: {
    status: RetrievalOnlySafeguardStatus;
    warnings: string[];
  };
  fallbackState: SeoAgentGatewayFallbackState;
  consumerHints: {
    consumerKey: string | null;
    targetModelFamily: string | null;
    adapterAvailable: boolean;
    warnings: string[];
  };
  warnings: string[];
  degraded: boolean;
  ruleVersion: string;
}

export interface SeoAgentGatewayResult {
  request: SeoAgentGatewayRequest;
  contextRequirements: GatewayContextRequirements;
  generationContext: SeoAgentGenerationContext;
}
