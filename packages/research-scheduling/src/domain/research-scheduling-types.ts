export type ResearchMode = 'focused' | 'manual' | 'background';

export type ResearchPriorityClass =
  | 'highest'
  | 'high'
  | 'medium'
  | 'low'
  | 'none';

export type ResearchTrigger =
  | 'generation_request'
  | 'user_waiting_for_generation'
  | 'manual_research'
  | 'competitor_refresh_requested'
  | 'scheduled_serp_refresh'
  | 'topic_expansion_candidate'
  | 'recently_discovered_keyword'
  | 'new_discovery_observation'
  | 'stale_page_recrawl'
  | 'sitemap_refresh'
  | 'entity_expansion_background';

export type TopicResearchLifecycle =
  | 'draft'
  | 'active'
  | 'paused'
  | 'archived';

export type BackgroundIntensity = 'low' | 'normal' | 'high';

export type ResearchObjectiveType =
  | 'generate_page'
  | 'generate_page_brief'
  | 'generate_content_cluster'
  | 'generate_local_seo_page'
  | 'generate_comparison_page'
  | 'refresh_seo_pack'
  | 'research_topic'
  | 'research_query'
  | 'research_competitor'
  | 'refresh_serp'
  | 'refresh_domain'
  | 'force_bounded_recrawl'
  | 'background_growth';

export type DispatchTarget =
  | 'discovery_sources'
  | 'url_frontier'
  | 'serp_intelligence'
  | 'content_processing'
  | 'knowledge_pipeline'
  | 'seo_pack';

export type FreshnessDecisionStatus = 'reuse' | 'refresh' | 'force_refresh';

export type RefreshReason =
  | 'generation_request'
  | 'manual_request'
  | 'ttl_expired'
  | 'serp_changed'
  | 'content_changed'
  | 'entity_missing'
  | 'ontology_updated'
  | 'policy_changed'
  | 'competitor_watch';

export type MediaPolicyMode = 'metadata_only' | 'selected' | 'full_archive';

export interface TopicResearchPolicy {
  backgroundIntensity: BackgroundIntensity;
  dailyCrawlBudget: number;
  dailySerpRefreshBudget: number;
  dailyKeywordExpansionBudget: number;
  dailyDomainDiscoveryBudget: number;
  recrawlTtlHours: number;
  maxCrawlDepth: number;
  maxPages: number;
  perHostRateLimitPerMinute: number;
  mediaPolicy: MediaResearchPolicy;
}

export interface MediaResearchPolicy {
  mode: MediaPolicyMode;
  maxDownloadsPerDay?: number;
  allowedMediaTypes?: Array<'image' | 'video' | 'audio' | 'pdf' | 'other'>;
}

export interface TopicResearchSnapshot {
  topicId: string;
  lifecycle: TopicResearchLifecycle;
  configurationVersion: number;
  researchPolicy: TopicResearchPolicy;
  activeWorkCount?: number;
  lastBackgroundResearchAt?: string;
}

export interface ResearchObjective {
  type: ResearchObjectiveType;
  query?: string;
  candidateKey?: string;
  url?: string;
  domain?: string;
  payload?: Record<string, unknown>;
}

export interface ResearchJobRequest {
  topicId: string;
  mode: ResearchMode;
  trigger: ResearchTrigger;
  objective: ResearchObjective;
  requestedBy?: string;
  force?: boolean;
  createdAt?: string;
}

export interface ResearchJob {
  jobKey: string;
  topicId: string;
  mode: ResearchMode;
  priorityClass: ResearchPriorityClass;
  trigger: ResearchTrigger;
  objective: ResearchObjective;
  requestedBy: string | null;
  createdAt: string;
  warnings: string[];
  degraded: boolean;
}

export interface BackgroundBudgetAllocation {
  topicId: string;
  lifecycle: TopicResearchLifecycle;
  intensity: BackgroundIntensity;
  allocatedCrawlBudget: number;
  allocatedSerpBudget: number;
  allocatedDiscoveryBudget: number;
  fairnessWeight: number;
  eligible: boolean;
  reason: string;
}

export interface FreshnessEvidence {
  assetKey: string;
  lastCrawledAt?: string;
  lastProcessedAt?: string;
  lastSerpSnapshotAt?: string;
  contentHashChanged?: boolean;
  etagChanged?: boolean;
  lastModifiedChanged?: boolean;
  policyChanged?: boolean;
  ontologyUpdated?: boolean;
  entityMissing?: boolean;
  ttlHours: number;
  now: string;
}

export interface FreshnessDecision {
  assetKey: string;
  status: FreshnessDecisionStatus;
  reasons: RefreshReason[];
  reuseExistingAssets: boolean;
  shouldCrawl: boolean;
  shouldProcess: boolean;
  shouldRefreshSerp: boolean;
  warnings: string[];
}

export interface ResearchAssetMetric {
  topicId: string;
  metricType:
    | 'sites_crawled'
    | 'pages_crawled'
    | 'keywords_discovered'
    | 'serp_snapshots_collected'
    | 'entities_extracted'
    | 'facts_extracted'
    | 'faq_blocks_extracted'
    | 'documents_processed'
    | 'media_assets_observed'
    | 'stale_url_count'
    | 'unprocessed_discovery_count';
  metricValue: number;
  sourceSubsystem: string;
  observedAt: string;
  metadata?: Record<string, unknown>;
}

export interface MediaAssetObservation {
  assetId: string;
  topicId: string;
  documentId?: string;
  mediaType: 'image' | 'video' | 'audio' | 'pdf' | 'other';
  width?: number;
  height?: number;
  alt?: string;
  caption?: string;
  surroundingHeading?: string;
  mediaPotential?: number;
}

export interface MediaPolicyDecision {
  assetId: string;
  storageStatus: 'metadata_only' | 'selected_for_download' | 'archive_allowed';
  shouldDownload: boolean;
  reason: string;
}

export interface ResearchDispatchCommand {
  target: DispatchTarget;
  priorityClass: ResearchPriorityClass;
  topicId: string;
  objective: ResearchObjective;
  reason: string;
  force: boolean;
}

export interface ResearchDispatchPlan {
  job: ResearchJob;
  freshnessDecisions: FreshnessDecision[];
  dispatchCommands: ResearchDispatchCommand[];
  assetMetrics: ResearchAssetMetric[];
  warnings: string[];
  degraded: boolean;
  ruleVersion: string;
}

export interface ResearchPlanRequest extends ResearchJobRequest {
  topicSnapshot: TopicResearchSnapshot;
  freshnessEvidence?: FreshnessEvidence[];
  existingAssetMetrics?: ResearchAssetMetric[];
}
