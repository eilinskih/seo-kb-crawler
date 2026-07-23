import {
  SeoPackInputSourcePackReference,
  SeoPackRequest,
  SeoPackScoredCandidateInput,
  SeoPackSourceReference,
} from './domain/seo-pack-types';

export interface NormalizedSeoPackInput {
  selectedCandidate: SeoPackScoredCandidateInput | null;
  sourcePackReferences: SeoPackInputSourcePackReference[];
  sourceReferences: SeoPackSourceReference[];
  warnings: string[];
  degraded: boolean;
}

export class SeoPackInputService {
  normalize(request: SeoPackRequest): NormalizedSeoPackInput {
    const selectedCandidate =
      request.candidateScoringPack?.scoredCandidates?.find(
        (candidate) => candidate.candidateKey === request.candidateKey,
      ) ??
      request.candidateScoringPack?.scoredCandidates?.[0] ??
      null;

    const sourcePackReferences = this.collectPackReferences(request);
    const sourceReferences = this.collectSourceReferences(request);
    const missingPackWarnings = [
      request.knowledgePack ? null : 'SEO Pack built without Knowledge Pack',
      request.demandPack ? null : 'SEO Pack built without Demand Pack',
      request.serpPack ? null : 'SEO Pack built without SERP Pack',
      request.serpIntentPack ? null : 'SEO Pack built without SERP Intent Pack',
      request.candidateScoringPack
        ? null
        : 'SEO Pack built without Candidate Scoring Pack',
    ].filter((warning): warning is string => Boolean(warning));

    const warnings = [
      ...(request.warnings ?? []),
      ...missingPackWarnings,
      ...(request.knowledgePack?.warnings ?? []),
      ...(request.demandPack?.warnings ?? []),
      ...(request.serpPack?.warnings ?? []),
      ...(request.serpIntentPack?.warnings ?? []),
      ...(request.candidateScoringPack?.warnings ?? []),
      ...(request.topicExpansionPack?.warnings ?? []),
      ...(request.longTailDiscoveryPack?.warnings ?? []),
      ...(selectedCandidate?.warnings ?? []),
    ];

    return {
      selectedCandidate,
      sourcePackReferences,
      sourceReferences,
      warnings: [...new Set(warnings)],
      degraded:
        Boolean(request.degraded) ||
        missingPackWarnings.length > 0 ||
        Boolean(request.knowledgePack?.degraded) ||
        Boolean(request.demandPack?.degraded) ||
        Boolean(request.serpPack?.degraded) ||
        Boolean(request.serpIntentPack?.degraded) ||
        Boolean(request.candidateScoringPack?.degraded) ||
        Boolean(request.topicExpansionPack?.degraded) ||
        Boolean(request.longTailDiscoveryPack?.degraded) ||
        Boolean(selectedCandidate?.degraded),
    };
  }

  private collectPackReferences(
    request: SeoPackRequest,
  ): SeoPackInputSourcePackReference[] {
    const references = [...(request.sourcePackReferences ?? [])];
    this.addPackReference(references, 'knowledge_pack', request.knowledgePack?.packId);
    this.addPackReference(references, 'demand_pack', request.demandPack?.packId);
    this.addPackReference(references, 'serp_pack', request.serpPack?.packId);
    this.addPackReference(
      references,
      'serp_intent_pack',
      request.serpIntentPack?.packId,
    );
    this.addPackReference(
      references,
      'candidate_scoring_pack',
      request.candidateScoringPack?.packId,
    );
    this.addPackReference(
      references,
      'topic_expansion_pack',
      request.topicExpansionPack?.packId,
    );
    this.addPackReference(
      references,
      'long_tail_discovery_pack',
      request.longTailDiscoveryPack?.packId,
    );

    return references.filter(
      (reference, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.packType === reference.packType &&
            candidate.packId === reference.packId,
        ) === index,
    );
  }

  private addPackReference(
    references: SeoPackInputSourcePackReference[],
    packType: SeoPackInputSourcePackReference['packType'],
    packId?: string,
  ): void {
    if (packId) {
      references.push({ packType, packId });
    }
  }

  private collectSourceReferences(
    request: SeoPackRequest,
  ): SeoPackSourceReference[] {
    const references = [
      ...(request.knowledgePack?.entities ?? []).flatMap(
        (entity) => entity.sourceReferences ?? [],
      ),
      ...(request.knowledgePack?.facts ?? []).flatMap(
        (fact) => fact.sourceReferences ?? [],
      ),
      ...(request.serpPack?.headings ?? []).flatMap(
        (heading) => heading.sourceReferences ?? [],
      ),
      ...(request.serpPack?.faqQuestions ?? []).flatMap(
        (faq) => faq.sourceReferences ?? [],
      ),
      ...(request.serpPack?.competitorInsights ?? []).flatMap(
        (insight) => insight.sourceReferences ?? [],
      ),
      ...(request.researchAssets ?? []).flatMap(
        (asset) => asset.sourceReferences ?? [],
      ),
    ];

    return references.filter(
      (reference, index, all) =>
        all.findIndex((candidate) => candidate.sourceId === reference.sourceId) ===
        index,
    );
  }
}
