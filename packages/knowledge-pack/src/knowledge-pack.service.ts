import { Inject, Injectable } from '@nestjs/common';
import { RetrievalResult, RetrievalService } from '@seo-kb/retrieval';
import { KNOWLEDGE_PACK_PROFILES } from './domain/knowledge-pack-profiles';
import {
  KnowledgePackAlias,
  KnowledgePackConfidence,
  KnowledgePackEvidenceChunk,
  KnowledgePackEvidenceGap,
  KnowledgePackFact,
  KnowledgePackFactRecord,
  KnowledgePackFactTrustRecord,
  KnowledgePackProfile,
  KnowledgePackRequest,
  KnowledgePackResponse,
  KnowledgePackSource,
  KnowledgePackSourceTrustRecord,
  KnowledgePackValidationError,
  KnowledgePackRepository,
  KnowledgePackEntityTrustRecord,
  KnowledgePackConsensusRecord,
} from './domain/knowledge-pack-types';
import { KNOWLEDGE_PACK_REPOSITORY } from './knowledge-pack.tokens';

@Injectable()
export class KnowledgePackService {
  constructor(
    private readonly retrieval: RetrievalService,
    @Inject(KNOWLEDGE_PACK_REPOSITORY)
    private readonly repository: KnowledgePackRepository,
  ) {}

  async build(request: KnowledgePackRequest): Promise<KnowledgePackResponse> {
    if (!request || typeof request.query !== 'string') {
      throw new KnowledgePackValidationError('query must be a non-empty string');
    }
    const profile = KNOWLEDGE_PACK_PROFILES[request.profile];
    if (!profile) {
      throw new KnowledgePackValidationError(
        'profile must be a supported knowledge pack profile',
      );
    }
    const normalizedQuery = request.query.trim().replace(/\s+/gu, ' ');
    if (normalizedQuery.length === 0) {
      throw new KnowledgePackValidationError('query must be a non-empty string');
    }

    const retrieval = await this.retrieval.search({
      query: normalizedQuery,
      topicId: request.topicId,
      language: request.language,
      geo: request.geo,
      vertical: request.vertical,
      limit: request.limit ?? profile.defaultLimit,
      rankingProfile: profile.rankingProfile,
      includeDebug: request.includeDebug,
      allowBroadFallback: true,
    });
    const sources = buildSources(retrieval.results);
    const evidenceChunks = buildEvidenceChunks(
      retrieval.results,
      sources,
      profile,
    );
    const facts = await this.repository.findCanonicalFactsByChunkIds(
      retrieval.results.map((result) => result.chunkId),
    );
    const packedFacts = buildFacts(facts, sources, retrieval.results);
    const entityIds = unique([
      ...packedFacts.map((fact) => fact.subjectEntityId),
      ...packedFacts
        .map((fact) => fact.objectEntityId)
        .filter((id): id is string => Boolean(id)),
    ]);
    const entities = await this.repository.findEntitiesByIds(entityIds);
    const aliases = await this.repository.findApprovedAliasesByEntityIds(entityIds);
    const ontologyReferences =
      await this.repository.findOntologyReferencesByPredicateIds(
        unique(packedFacts.map((fact) => fact.predicateId)),
      );
    const sourceTrust = await this.repository.findSourceTrustByUrls(
      unique(sources.flatMap((source) => [
        source.sourceUrl,
        source.canonicalUrl,
      ].filter((url): url is string => Boolean(url)))),
    );
    const factTrust = await this.repository.findFactTrustByFactIds(
      packedFacts.map((fact) => fact.factId),
    );
    const entityTrust = await this.repository.findEntityTrustByEntityIds(entityIds);
    const consensus = await this.repository.findConsensusByFactIds(
      packedFacts.map((fact) => fact.factId),
    );
    const trustedSources = attachSourceTrust(sources, sourceTrust);
    const trustedFacts = attachConsensus(
      attachFactTrust(packedFacts, factTrust),
      consensus,
    );
    const trustedEntities = attachEntityTrust(entities, entityTrust);
    const confidence = buildConfidence(trustedFacts, trustedSources);
    const visibleAliases = filterAliasesForLanguage(aliases, request.language);

    return {
      normalizedQuery,
      profile: profile.name,
      entities: trustedEntities,
      aliases: visibleAliases,
      facts: trustedFacts,
      evidenceChunks,
      sources: trustedSources,
      ontologyReferences,
      evidenceGaps: buildGaps({
        facts: trustedFacts,
        sources: trustedSources,
        aliases: visibleAliases,
        ontologyReferenceCount: ontologyReferences.length,
        retrievalDegraded: retrieval.degraded,
        retrievalWarnings: retrieval.warnings,
      }),
      confidence,
      retrieval: {
        degraded: retrieval.degraded,
        warnings: retrieval.warnings,
        resultCount: retrieval.results.length,
      },
      rawRetrieval: request.includeRawRetrieval ? retrieval.results : undefined,
      debug: request.includeDebug ? { profile } : undefined,
    };
  }
}

function attachSourceTrust(
  sources: KnowledgePackSource[],
  trustRecords: KnowledgePackSourceTrustRecord[],
): KnowledgePackSource[] {
  const trustByUrl = new Map<string, KnowledgePackSourceTrustRecord>();
  for (const record of trustRecords) {
    trustByUrl.set(record.sourceUrl, record);
    if (record.canonicalUrl) {
      trustByUrl.set(record.canonicalUrl, record);
    }
  }

  return sources.map((source) => {
    const trust = trustByUrl.get(source.canonicalUrl ?? source.sourceUrl);
    return trust
      ? {
          ...source,
          trust: {
            sourceType: trust.sourceType,
            reviewStatus: trust.reviewStatus,
            score: trust.score,
            ruleVersion: trust.ruleVersion,
            components: trust.components,
          },
        }
      : source;
  });
}

function attachFactTrust(
  facts: KnowledgePackFact[],
  trustRecords: KnowledgePackFactTrustRecord[],
): KnowledgePackFact[] {
  const trustByFactId = new Map(trustRecords.map((record) => [record.factId, record]));
  return facts.map((fact) => {
    const trust = trustByFactId.get(fact.factId);
    return trust
      ? {
          ...fact,
          trust: {
            evidenceStrengthScore: trust.evidenceStrengthScore,
            sourceTrustScore: trust.sourceTrustScore,
            extractionConfidence: trust.extractionConfidence,
            normalizationConfidence: trust.normalizationConfidence,
            finalConfidence: trust.finalConfidence,
            uncertaintyFlags: trust.uncertaintyFlags,
            components: trust.components,
          },
        }
      : fact;
  });
}

function attachConsensus(
  facts: KnowledgePackFact[],
  consensusRecords: KnowledgePackConsensusRecord[],
): KnowledgePackFact[] {
  const consensusByFactId = new Map(
    consensusRecords.map((record) => [record.factId, record]),
  );
  return facts.map((fact) => {
    const consensus = consensusByFactId.get(fact.factId);
    return consensus
      ? {
          ...fact,
          consensus: {
            groupKey: consensus.groupKey,
            confidenceLevel: consensus.confidenceLevel,
            supportCounts: consensus.supportCounts,
            strongestValue: consensus.strongestValue,
            conflict: consensus.conflict,
          },
        }
      : fact;
  });
}

function attachEntityTrust<T extends { entityId: string }>(
  entities: T[],
  trustRecords: KnowledgePackEntityTrustRecord[],
): T[] {
  const trustByEntityId = new Map(
    trustRecords.map((record) => [record.entityId, record]),
  );
  return entities.map((entity) => {
    const trust = trustByEntityId.get(entity.entityId);
    return trust
      ? {
          ...entity,
          trust: {
            aliasConfidence: trust.aliasConfidence,
            mentionCount: trust.mentionCount,
            sourceDiversityScore: trust.sourceDiversityScore,
            averageSourceTrust: trust.averageSourceTrust,
            finalConfidence: trust.finalConfidence,
            components: trust.components,
          },
        }
      : entity;
  });
}

function buildSources(results: RetrievalResult[]): KnowledgePackSource[] {
  const byUrl = new Map<string, KnowledgePackSource>();
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

function buildEvidenceChunks(
  results: RetrievalResult[],
  sources: KnowledgePackSource[],
  profile: KnowledgePackProfile,
): KnowledgePackEvidenceChunk[] {
  const sourceIdByUrl = new Map(
    sources.map((source) => [source.canonicalUrl ?? source.sourceUrl, source.id]),
  );
  return [...results]
    .sort((a, b) => b.score - a.score || a.chunkId.localeCompare(b.chunkId))
    .map((result) => ({
      chunkId: result.chunkId,
      documentId: result.documentId,
      documentVersionId: result.documentVersionId,
      sourceIds: [
        sourceIdByUrl.get(result.canonicalUrl ?? result.sourceUrl),
      ].filter((id): id is string => Boolean(id)),
      headingPath: result.headingPath,
      sectionTitle: result.sectionTitle,
      chunkType: result.chunkType,
      language: result.language,
      geoHints: result.geoHints,
      text: profile.includeRawEvidenceText ? result.text : '',
      score: result.score,
    }));
}

function buildFacts(
  facts: KnowledgePackFactRecord[],
  sources: KnowledgePackSource[],
  results: RetrievalResult[],
): KnowledgePackFact[] {
  const resultByChunkId = new Map(results.map((result) => [result.chunkId, result]));
  const sourceIdByUrl = new Map(
    sources.map((source) => [source.canonicalUrl ?? source.sourceUrl, source.id]),
  );
  const grouped = new Map<string, KnowledgePackFactRecord[]>();
  for (const fact of facts) {
    const key = [
      fact.subjectEntityId,
      fact.objectEntityId ?? '',
      fact.predicateId,
      stableStringify(fact.normalizedAttributes),
    ].join('\u001f');
    grouped.set(key, [...(grouped.get(key) ?? []), fact]);
  }

  return [...grouped.values()]
    .map((group) => {
      const sortedFacts = [...group].sort((a, b) =>
        b.confidence - a.confidence || a.factId.localeCompare(b.factId),
      );
      const representative = sortedFacts[0];
      const supportingChunkIds = unique(
        sortedFacts.map((fact) => fact.sourceChunkId),
      );
      const sourceIds = unique(
        supportingChunkIds
          .map((chunkId) => {
            const result = resultByChunkId.get(chunkId);
            return result
              ? sourceIdByUrl.get(result.canonicalUrl ?? result.sourceUrl)
              : undefined;
          })
          .filter((id): id is string => Boolean(id)),
      );
      const confidence =
        sortedFacts.reduce((sum, fact) => sum + fact.confidence, 0) /
        sortedFacts.length;
      return {
        factId: representative.factId,
        subjectEntityId: representative.subjectEntityId,
        objectEntityId: representative.objectEntityId,
        predicateId: representative.predicateId,
        predicateKey: representative.predicateKey,
        normalizedAttributes: representative.normalizedAttributes,
        confidence,
        provenance: representative.provenance,
        supportingChunkIds,
        sourceIds,
      };
    })
    .sort((a, b) => b.confidence - a.confidence || a.factId.localeCompare(b.factId));
}

function buildGaps(input: {
  facts: KnowledgePackFact[];
  sources: KnowledgePackSource[];
  aliases: KnowledgePackAlias[];
  ontologyReferenceCount: number;
  retrievalDegraded: boolean;
  retrievalWarnings: string[];
}): KnowledgePackEvidenceGap[] {
  const gaps: KnowledgePackEvidenceGap[] = [];
  if (input.facts.length === 0) {
    gaps.push({
      code: 'no_canonical_facts',
      detail: 'No canonical facts were available for retrieved evidence chunks',
    });
  }
  if (input.facts.some((fact) => fact.supportingChunkIds.length < 2)) {
    gaps.push({
      code: 'weak_fact_support',
      detail: 'At least one fact has fewer than two supporting chunks',
    });
  }
  if (input.sources.length > 0 && new Set(input.sources.map((source) =>
    source.sourceDomain,
  )).size <= 1) {
    gaps.push({
      code: 'single_source_support',
      detail: 'Knowledge pack evidence comes from one source domain',
    });
  }
  if (input.facts.length > 0 && input.aliases.length === 0) {
    gaps.push({
      code: 'missing_entity_aliases',
      detail: 'Facts reference entities but no approved aliases were available',
    });
  }
  if (input.facts.length > 0 && input.ontologyReferenceCount === 0) {
    gaps.push({
      code: 'missing_ontology_reference',
      detail: 'Facts were available but ontology references were missing',
    });
  }
  if (input.retrievalDegraded) {
    gaps.push({
      code: 'retrieval_degraded',
      detail: input.retrievalWarnings.join('; ') || 'Retrieval ran degraded',
    });
  }
  if (input.facts.some((fact) =>
    fact.trust?.uncertaintyFlags.includes('possible_conflict_unresolved'),
  )) {
    gaps.push({
      code: 'possible_conflict_unresolved',
      detail: 'At least one fact has unresolved conflict uncertainty',
    });
  }
  return gaps;
}

function buildConfidence(
  facts: KnowledgePackFact[],
  sources: KnowledgePackSource[],
): KnowledgePackConfidence {
  const averageFactConfidence = facts.length === 0
    ? null
    : facts.reduce((sum, fact) => sum + fact.confidence, 0) / facts.length;
  return {
    level: confidenceLevel(averageFactConfidence, facts.length, sources.length),
    factCount: facts.length,
    sourceCount: sources.length,
    averageFactConfidence,
  };
}

function confidenceLevel(
  average: number | null,
  factCount: number,
  sourceCount: number,
): KnowledgePackConfidence['level'] {
  if (average === null || factCount === 0) {
    return 'unknown';
  }
  if (average >= 0.8 && sourceCount >= 2) {
    return 'high';
  }
  if (average >= 0.6) {
    return 'medium';
  }
  return 'low';
}

function filterAliasesForLanguage(
  aliases: KnowledgePackAlias[],
  language?: string,
): KnowledgePackAlias[] {
  if (!language) {
    return aliases;
  }
  return aliases.filter((alias) => !alias.language || alias.language === language);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function stableStringify(value: Record<string, unknown>): string {
  return JSON.stringify(sortObject(value));
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortObject(nestedValue)]),
    );
  }
  return value;
}
