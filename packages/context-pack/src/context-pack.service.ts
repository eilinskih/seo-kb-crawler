import { Injectable, Optional } from '@nestjs/common';
import {
  KnowledgePackProfileName,
  KnowledgePackService,
} from '@seo-kb/knowledge-pack';
import { RetrievalService } from '@seo-kb/retrieval';
import { CONTEXT_PACK_PROFILES } from './domain/context-pack-profiles';
import {
  ContextPackGap,
  ContextPackProfileName,
  ContextPackRequest,
  ContextPackResponse,
  ContextPackSection,
  ContextPackSource,
  ContextPackValidationError,
  NormalizedContextQuery,
} from './domain/context-pack-types';

@Injectable()
export class ContextPackService {
  constructor(
    private readonly retrieval: RetrievalService,
    @Optional()
    private readonly knowledgePack?: KnowledgePackService,
  ) {}

  async build(request: ContextPackRequest): Promise<ContextPackResponse> {
    if (!request || typeof request.query !== 'string') {
      throw new ContextPackValidationError('query must be a non-empty string');
    }
    const profile = CONTEXT_PACK_PROFILES[request.profile];
    if (!profile) {
      throw new ContextPackValidationError('profile must be a supported context pack profile');
    }
    const normalized = normalizeRequest(request, profile.defaultLimit);
    if (normalized.normalizedQuery.length === 0) {
      throw new ContextPackValidationError('query must be a non-empty string');
    }
    const retrieval = await this.retrieval.search({
      query: normalized.normalizedQuery,
      topicId: normalized.topicId,
      language: normalized.language,
      geo: normalized.geo,
      limit: normalized.limit,
      rankingProfile: profile.rankingProfile,
      includeDebug: request.includeDebug || profile.includeRetrievalDebug,
    });
    const sources = buildSources(retrieval.results);
    const sections = buildSections(retrieval.results, sources);
    const faqCandidates = profile.includeFaqCandidates
      ? buildFaqCandidates(sections)
      : [];
    const outlineHints = profile.includeOutlineHints
      ? sections.map((section) => ({
          headingPath: section.headingPath,
          sectionTitle: section.sectionTitle,
          sourceIds: section.sourceIds,
        }))
      : [];
    const knowledgePack = request.includeKnowledgePack && this.knowledgePack
      ? await this.knowledgePack.build({
          query: normalized.normalizedQuery,
          topicId: normalized.topicId,
          language: normalized.language,
          geo: normalized.geo,
          vertical: request.vertical,
          profile: request.knowledgePackProfile ?? toKnowledgePackProfile(
            request.profile,
          ),
          limit: request.limit,
          includeDebug: request.includeDebug,
          includeRawRetrieval: request.includeRawRetrieval,
        })
      : undefined;

    return {
      normalizedQuery: normalized.normalizedQuery,
      profile: profile.name,
      sections,
      sources,
      faqCandidates,
      outlineHints,
      contentGaps: buildGaps(
        retrieval.degraded,
        retrieval.warnings,
        sources,
        request,
        request.includeKnowledgePack === true && !this.knowledgePack,
      ),
      retrieval: {
        degraded: retrieval.degraded,
        warnings: retrieval.warnings,
        resultCount: retrieval.results.length,
      },
      knowledgePack,
      rawRetrieval: request.includeRawRetrieval ? retrieval.results : undefined,
      debug: request.includeDebug ? { profile } : undefined,
    };
  }
}

function normalizeRequest(
  request: ContextPackRequest,
  defaultLimit: number,
): NormalizedContextQuery {
  return {
    originalQuery: request.query,
    normalizedQuery: request.query.trim().replace(/\s+/gu, ' '),
    topicId: request.topicId,
    language: request.language,
    geo: request.geo,
    profile: request.profile,
    limit: request.limit ?? defaultLimit,
  };
}

function buildSources(
  results: Awaited<ReturnType<RetrievalService['search']>>['results'],
): ContextPackSource[] {
  const byUrl = new Map<string, ContextPackSource>();

  for (const result of results) {
    const key = result.canonicalUrl ?? result.sourceUrl;
    if (!byUrl.has(key)) {
      byUrl.set(key, {
        id: `source-${byUrl.size + 1}`,
        sourceUrl: result.sourceUrl,
        canonicalUrl: result.canonicalUrl,
        sourceDomain: result.sourceDomain,
        language: result.language,
        geoHints: result.geoHints,
      });
    }
  }

  return [...byUrl.values()];
}

function buildSections(
  results: Awaited<ReturnType<RetrievalService['search']>>['results'],
  sources: ContextPackSource[],
): ContextPackSection[] {
  const sourceIdByUrl = new Map(
    sources.map((source) => [source.canonicalUrl ?? source.sourceUrl, source.id]),
  );
  const sections = new Map<string, ContextPackSection>();

  for (const result of [...results].sort((a, b) => b.score - a.score)) {
    const key = [...result.headingPath, result.sectionTitle ?? ''].join('\u0000');
    const sourceId = sourceIdByUrl.get(result.canonicalUrl ?? result.sourceUrl);
    const existing = sections.get(key);
    if (existing) {
      existing.chunkIds.push(result.chunkId);
      existing.text.push(result.text);
      if (sourceId && !existing.sourceIds.includes(sourceId)) {
        existing.sourceIds.push(sourceId);
      }
      existing.score = Math.max(existing.score, result.score);
      continue;
    }

    sections.set(key, {
      headingPath: result.headingPath,
      sectionTitle: result.sectionTitle,
      chunkIds: [result.chunkId],
      sourceIds: sourceId ? [sourceId] : [],
      text: [result.text],
      score: result.score,
    });
  }

  return [...sections.values()];
}

function buildFaqCandidates(
  sections: ContextPackSection[],
): {
  chunkId: string;
  question: string;
  sourceIds: string[];
}[] {
  return sections
    .filter((section) =>
      section.sectionTitle?.includes('?') ||
      section.headingPath.some((heading) => heading.includes('?')),
    )
    .map((section) => ({
      chunkId: section.chunkIds[0],
      question:
        section.sectionTitle ??
        section.headingPath[section.headingPath.length - 1],
      sourceIds: section.sourceIds,
    }));
}

function buildGaps(
  degraded: boolean,
  warnings: string[],
  sources: ContextPackSource[],
  request: ContextPackRequest,
  knowledgePackUnavailable: boolean,
): ContextPackGap[] {
  const gaps: ContextPackGap[] = [];
  if (knowledgePackUnavailable) {
    gaps.push({
      code: 'knowledge_pack_unavailable',
      detail: 'Knowledge Pack was requested but the service is not available',
    });
  }
  if (hasResearchAssetFilter(request)) {
    gaps.push({
      code: 'research_asset_filter_deferred',
      detail: 'Research Assets filtering is accepted by the API contract but not connected to a Research Assets subsystem yet',
    });
  }
  if (degraded) {
    gaps.push({
      code: 'degraded_retrieval',
      detail: warnings.join('; ') || 'Retrieval ran in degraded mode',
    });
  }
  if (sources.length < 2) {
    gaps.push({
      code: 'few_sources',
      detail: 'Context pack has fewer than two distinct sources',
    });
  }
  if (new Set(sources.map((source) => source.sourceDomain)).size <= 1) {
    gaps.push({
      code: 'single_domain',
      detail: 'Context pack sources come from one domain',
    });
  }
  if (sources.some((source) => !source.language)) {
    gaps.push({
      code: 'missing_language',
      detail: 'At least one source is missing language metadata',
    });
  }
  if (sources.some((source) => source.geoHints.length === 0)) {
    gaps.push({
      code: 'missing_geo',
      detail: 'At least one source is missing geo metadata',
    });
  }
  return gaps;
}

function toKnowledgePackProfile(
  profile: ContextPackProfileName,
): KnowledgePackProfileName {
  switch (profile) {
    case 'article_generation':
      return 'article_generation';
    case 'competitor_analysis':
      return 'competitor_research';
    case 'outline':
      return 'content_planning';
    case 'raw_retrieval':
      return 'fact_verification';
    case 'research':
      return 'entity_research';
  }
}

function hasResearchAssetFilter(request: ContextPackRequest): boolean {
  const filter = request.researchAssetFilter;
  if (!filter) {
    return false;
  }
  return Boolean(
    filter.includeOnlyApproved !== undefined ||
      (filter.assetIds && filter.assetIds.length > 0) ||
      (filter.assetTypes && filter.assetTypes.length > 0),
  );
}
