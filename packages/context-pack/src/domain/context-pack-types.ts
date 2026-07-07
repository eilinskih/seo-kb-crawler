import { GeoHint } from '@seo-kb/content-processing';
import {
  RankingProfileName,
  RetrievalResult,
} from '@seo-kb/retrieval';

export type ContextPackProfileName =
  | 'article_generation'
  | 'research'
  | 'outline'
  | 'competitor_analysis'
  | 'raw_retrieval';

export interface ContextPackGeoInput {
  countryCode?: string;
  regionCode?: string;
  city?: string;
}

export interface ContextPackRequest {
  query: string;
  topicId?: string;
  language?: string;
  geo?: ContextPackGeoInput;
  vertical?: string;
  objective?: string;
  profile: ContextPackProfileName;
  limit?: number;
  includeDebug?: boolean;
  includeRawRetrieval?: boolean;
}

export interface ContextPackProfile {
  name: ContextPackProfileName;
  rankingProfile: RankingProfileName;
  defaultLimit: number;
  includeFaqCandidates: boolean;
  includeOutlineHints: boolean;
  includeRetrievalDebug: boolean;
}

export interface NormalizedContextQuery {
  originalQuery: string;
  normalizedQuery: string;
  topicId?: string;
  language?: string;
  geo?: ContextPackGeoInput;
  profile: ContextPackProfileName;
  limit: number;
}

export interface ContextPackSource {
  id: string;
  sourceUrl: string;
  canonicalUrl: string | null;
  sourceDomain: string | null;
  language: string | null;
  geoHints: GeoHint[];
}

export interface ContextPackSection {
  headingPath: string[];
  sectionTitle: string | null;
  chunkIds: string[];
  sourceIds: string[];
  text: string[];
  score: number;
}

export interface ContextPackFaqCandidate {
  chunkId: string;
  question: string;
  sourceIds: string[];
}

export interface ContextPackOutlineHint {
  headingPath: string[];
  sectionTitle: string | null;
  sourceIds: string[];
}

export interface ContextPackGap {
  code:
    | 'degraded_retrieval'
    | 'few_sources'
    | 'single_domain'
    | 'missing_language'
    | 'missing_geo'
    | 'no_faq_candidates';
  detail: string;
}

export interface ContextPackResponse {
  normalizedQuery: string;
  profile: ContextPackProfileName;
  sections: ContextPackSection[];
  sources: ContextPackSource[];
  faqCandidates: ContextPackFaqCandidate[];
  outlineHints: ContextPackOutlineHint[];
  contentGaps: ContextPackGap[];
  retrieval: {
    degraded: boolean;
    warnings: string[];
    resultCount: number;
  };
  rawRetrieval?: RetrievalResult[];
  debug?: {
    profile: ContextPackProfile;
  };
}

export class ContextPackValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContextPackValidationError';
  }
}
