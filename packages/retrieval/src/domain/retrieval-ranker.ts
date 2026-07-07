import { RANKING_PROFILES } from './ranking-profiles';
import {
  RetrievalCandidate,
  RetrievalQuery,
  RetrievalResult,
  RetrievalScoreBreakdown,
} from './retrieval-types';

export function rankRetrievalCandidates(
  query: RetrievalQuery,
  candidates: RetrievalCandidate[],
  warnings: string[] = [],
): RetrievalResult[] {
  const weights = RANKING_PROFILES[query.rankingProfile];
  const deduped = dedupeCandidates(candidates);
  const domainCounts = new Map<string, number>();

  return deduped
    .map((candidate) => {
      const domainKey = candidate.sourceDomain ?? candidate.documentId;
      const domainCount = domainCounts.get(domainKey) ?? 0;
      domainCounts.set(domainKey, domainCount + 1);
      const breakdown = scoreBreakdown(query, candidate, domainCount);
      const score = Object.entries(breakdown).reduce(
        (total, [key, value]) =>
          total + value * weights[key as keyof RetrievalScoreBreakdown],
        0,
      );

      return toResult(query, candidate, score, breakdown, warnings);
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, query.limit);
}

function dedupeCandidates(
  candidates: RetrievalCandidate[],
): RetrievalCandidate[] {
  const byHash = new Map<string, RetrievalCandidate>();

  for (const candidate of candidates) {
    const key = candidate.normalizedTextHash || candidate.contentHash;
    const existing = byHash.get(key);
    byHash.set(key, existing ? mergeCandidates(existing, candidate) : candidate);
  }

  return [...byHash.values()];
}

function mergeCandidates(
  first: RetrievalCandidate,
  second: RetrievalCandidate,
): RetrievalCandidate {
  const base = candidateBaseScore(second) > candidateBaseScore(first)
    ? second
    : first;
  return {
    ...base,
    vectorScore: Math.max(first.vectorScore ?? 0, second.vectorScore ?? 0),
    keywordScore: Math.max(first.keywordScore ?? 0, second.keywordScore ?? 0),
    metadataScore: Math.max(first.metadataScore ?? 0, second.metadataScore ?? 0),
    matchedTerms: unique([...first.matchedTerms, ...second.matchedTerms]),
    modes: unique([...first.modes, ...second.modes]),
  };
}

function scoreBreakdown(
  query: RetrievalQuery,
  candidate: RetrievalCandidate,
  domainCount: number,
): RetrievalScoreBreakdown {
  const headingText = candidate.headingPath.join(' ').toLowerCase();
  const queryTerms = terms(query.query);
  const headingMatches = queryTerms.filter((term) =>
    headingText.includes(term),
  ).length;

  return {
    vector: candidate.vectorScore ?? 0,
    keyword: candidate.keywordScore ?? 0,
    metadata: candidate.metadataScore ?? 0,
    heading: queryTerms.length === 0 ? 0 : headingMatches / queryTerms.length,
    topic: query.topicId && candidate.topicId === query.topicId ? 1 : 0,
    language: query.language && candidate.language === query.language ? 1 : 0,
    geo: geoScore(query, candidate),
    chunkType: query.chunkTypes?.includes(candidate.chunkType) ? 1 : 0,
    diversity: domainCount === 0 ? 1 : 1 / (domainCount + 1),
  };
}

function geoScore(
  query: RetrievalQuery,
  candidate: RetrievalCandidate,
): number {
  if (!query.geo) {
    return 0;
  }
  return candidate.geoHints.some((hint) =>
    (!query.geo?.countryCode || hint.countryCode === query.geo.countryCode) &&
    (!query.geo?.regionCode || hint.regionCode === query.geo.regionCode) &&
    (!query.geo?.city || hint.city === query.geo.city),
  ) ? 1 : 0;
}

function candidateBaseScore(candidate: RetrievalCandidate): number {
  return (
    (candidate.vectorScore ?? 0) +
    (candidate.keywordScore ?? 0) +
    (candidate.metadataScore ?? 0)
  );
}

function toResult(
  query: RetrievalQuery,
  candidate: RetrievalCandidate,
  score: number,
  scoreBreakdown: RetrievalScoreBreakdown,
  warnings: string[],
): RetrievalResult {
  return {
    chunkId: candidate.chunkId,
    documentId: candidate.documentId,
    documentVersionId: candidate.documentVersionId,
    topicId: candidate.topicId,
    score,
    scoreBreakdown,
    matchedTerms: candidate.matchedTerms,
    language: candidate.language,
    geoHints: candidate.geoHints,
    sourceUrl: candidate.sourceUrl,
    canonicalUrl: candidate.canonicalUrl,
    sourceDomain: candidate.sourceDomain,
    headingPath: candidate.headingPath,
    sectionTitle: candidate.sectionTitle,
    chunkType: candidate.chunkType,
    text: candidate.text,
    debug: query.includeDebug
      ? {
          modes: candidate.modes,
          rankingProfile: query.rankingProfile,
          warnings,
        }
      : undefined,
  };
}

function terms(query: string): string[] {
  return query.toLowerCase().split(/\s+/u).filter(Boolean);
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
