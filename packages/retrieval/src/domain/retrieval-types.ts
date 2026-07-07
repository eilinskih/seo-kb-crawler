import { GeoHint } from '@seo-kb/content-processing';
import { ChunkType } from '@seo-kb/chunking';

export type RetrievalMode = 'vector' | 'keyword' | 'metadata';

export type RankingProfileName =
  | 'balanced'
  | 'semantic'
  | 'keyword_strict'
  | 'local_geo'
  | 'exploration';

export interface RetrievalGeoFilter {
  countryCode?: string;
  regionCode?: string;
  city?: string;
}

export interface RetrievalQuery {
  query: string;
  topicId?: string;
  language?: string;
  geo?: RetrievalGeoFilter;
  vertical?: string;
  intent?: string;
  entityFilters?: string[];
  chunkTypes?: ChunkType[];
  sourceDomains?: string[];
  limit: number;
  rankingProfile: RankingProfileName;
  includeDebug?: boolean;
  allowBroadFallback?: boolean;
}

export interface RetrievalCandidate {
  chunkId: string;
  documentId: string;
  documentVersionId: string;
  topicId: string;
  text: string;
  language: string | null;
  geoHints: GeoHint[];
  sourceUrl: string;
  canonicalUrl: string | null;
  sourceDomain: string | null;
  headingPath: string[];
  sectionTitle: string | null;
  chunkType: ChunkType;
  contentHash: string;
  normalizedTextHash: string;
  vectorScore?: number;
  keywordScore?: number;
  metadataScore?: number;
  matchedTerms: string[];
  modes: RetrievalMode[];
}

export interface RetrievalScoreBreakdown {
  vector: number;
  keyword: number;
  metadata: number;
  heading: number;
  topic: number;
  language: number;
  geo: number;
  chunkType: number;
  diversity: number;
}

export interface RetrievalDebug {
  modes: RetrievalMode[];
  rankingProfile: RankingProfileName;
  warnings: string[];
}

export interface RetrievalResult {
  chunkId: string;
  documentId: string;
  documentVersionId: string;
  topicId: string;
  score: number;
  scoreBreakdown: RetrievalScoreBreakdown;
  matchedTerms: string[];
  language: string | null;
  geoHints: GeoHint[];
  sourceUrl: string;
  canonicalUrl: string | null;
  sourceDomain: string | null;
  headingPath: string[];
  sectionTitle: string | null;
  chunkType: ChunkType;
  text: string;
  debug?: RetrievalDebug;
}

export interface RetrievalResponse {
  results: RetrievalResult[];
  warnings: string[];
  degraded: boolean;
}

export interface RetrievalRepository {
  searchVector(query: RetrievalQuery): Promise<RetrievalCandidate[]>;
  searchKeyword(query: RetrievalQuery): Promise<RetrievalCandidate[]>;
  searchMetadata(query: RetrievalQuery): Promise<RetrievalCandidate[]>;
}
