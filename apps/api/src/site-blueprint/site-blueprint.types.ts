import type {
  DemandCandidatePageRecord,
  PageCandidatePlanningRecommendation,
  PageCandidatePlanningRole,
} from '@seo-kb/demand-engine';
import type { SeoPackProfileName, SeoPackRecord } from '@seo-kb/seo-pack';
import type { TopicRecord } from '@seo-kb/topic-engine';

export type SiteBlueprintDeploymentTarget = 'cloudflare_pages';
export type SiteBlueprintFramework = 'nextjs';
export type SiteBlueprintOutputMode = 'static_first';
export type SiteBlueprintSeoPackStatus = 'existing' | 'needed';

export interface SiteBlueprintDeployment {
  target: SiteBlueprintDeploymentTarget;
  framework: SiteBlueprintFramework;
  outputMode: SiteBlueprintOutputMode;
  buildCommand: string;
  buildDirectory: string;
  nextConfig: {
    output: 'export';
    trailingSlash: boolean;
    imagesUnoptimized: boolean;
  };
  constraints: string[];
}

export interface SiteBlueprintSeoPackRef {
  candidateKey: string;
  status: SiteBlueprintSeoPackStatus;
  packId: string | null;
  degraded: boolean | null;
}

export interface SiteBlueprintInternalLink {
  targetSlug: string;
  anchorConcept: string;
  reason: string;
}

export interface SiteBlueprintPage {
  slug: string;
  routePath: string;
  titleConcept: string;
  primaryKeyword: string;
  supportingKeywords: string[];
  pageType: DemandCandidatePageRecord['proposedPageType'];
  generationProfile: SeoPackProfileName;
  readiness: NonNullable<DemandCandidatePageRecord['readiness']>;
  role: PageCandidatePlanningRole;
  recommendation: PageCandidatePlanningRecommendation;
  priorityScore: number;
  clusterKey: string;
  clusterLabel: string;
  primaryIntent: string | null;
  evidenceUrls: string[];
  missingMetrics: string[];
  missingResearchGaps: string[];
  seoPack: SiteBlueprintSeoPackRef;
  internalLinks: SiteBlueprintInternalLink[];
  warnings: string[];
}

export interface SiteBlueprintNavigationItem {
  label: string;
  routePath: string;
  role: PageCandidatePlanningRole;
}

export interface SiteBlueprintSitemap {
  routePaths: string[];
}

export interface SiteBlueprintWorkspaceFile {
  path: string;
  purpose: string;
  required: boolean;
}

export interface SiteBlueprintWorkspacePageTask {
  routePath: string;
  appRouterFile: string;
  sourceBlueprintPageSlug: string;
  primaryKeyword: string;
  seoPackId: string | null;
  seoPackStatus: SiteBlueprintSeoPackStatus;
  action: 'generate' | 'merge' | 'defer';
  blockingWarnings: string[];
}

export interface SiteBlueprintWorkspacePlan {
  targetWorkspace: {
    framework: SiteBlueprintFramework;
    deploymentTarget: SiteBlueprintDeploymentTarget;
    outputMode: SiteBlueprintOutputMode;
  };
  requiredFiles: SiteBlueprintWorkspaceFile[];
  pageTasks: SiteBlueprintWorkspacePageTask[];
  launchChecklist: string[];
}

export interface SiteBlueprintStaticExportFile {
  path: string;
  contentType: 'typescript' | 'text';
  overwritePolicy: 'create_or_update' | 'manual_merge';
  content: string;
}

export interface SiteBlueprintStaticExportKit {
  files: SiteBlueprintStaticExportFile[];
  notes: string[];
}

export type SiteBlueprintLaunchReadinessStatus =
  | 'ready'
  | 'degraded_ready'
  | 'blocked';

export interface SiteBlueprintLaunchReadiness {
  status: SiteBlueprintLaunchReadinessStatus;
  canGenerateStaticSite: boolean;
  canPublishWithoutReview: boolean;
  blockers: string[];
  warnings: string[];
  nextActions: string[];
}

export interface SiteBlueprint {
  topicId: string;
  topicSlug: string;
  topicName: string;
  generatedAt: string;
  language: string | null;
  geo: {
    countryCode: string | null;
    regionCode: string | null;
  };
  deployment: SiteBlueprintDeployment;
  summary: {
    totalCandidatePages: number;
    includedPages: number;
    creatablePages: number;
    mergePages: number;
    deferredPages: number;
    missingSeoPacks: number;
    existingSeoPacks: number;
  };
  navigation: SiteBlueprintNavigationItem[];
  sitemap: SiteBlueprintSitemap;
  workspacePlan: SiteBlueprintWorkspacePlan;
  staticExportKit: SiteBlueprintStaticExportKit;
  launchReadiness: SiteBlueprintLaunchReadiness;
  pages: SiteBlueprintPage[];
  warnings: string[];
  degraded: boolean;
}

export interface BuildSiteBlueprintInput {
  topic: TopicRecord;
  candidatePages: DemandCandidatePageRecord[];
  seoPacks: SeoPackRecord[];
  generatedAt?: string;
}

export interface SiteGenerationPackage {
  generatedAt: string;
  blueprint: SiteBlueprint;
  seoPacks: SeoPackRecord[];
  missingSeoPackCandidateKeys: string[];
  workspaceExportFiles: SiteBlueprintStaticExportFile[];
  agentInstructions: string[];
  warnings: string[];
  degraded: boolean;
}
