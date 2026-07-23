import {
  SeoPack,
  SeoPackRequest,
  SeoPackUncertainty,
} from './domain/seo-pack-types';
import {
  DEFAULT_SEO_PACK_PROFILE,
  DEFAULT_SEO_PACK_RULE_VERSION,
} from './seo-pack-defaults';
import { FaqRecommendationService } from './faq-recommendation.service';
import { GenerationConstraintService } from './generation-constraint.service';
import { InternalLinkingHintService } from './internal-linking-hint.service';
import { PageBriefService } from './page-brief.service';
import { RecommendedOutlineService } from './recommended-outline.service';
import { RequiredEvidenceService } from './required-evidence.service';
import { SeoPackInputService } from './seo-pack-input.service';
import { SerpRequirementService } from './serp-requirement.service';

export class SeoPackService {
  constructor(
    private readonly inputService = new SeoPackInputService(),
    private readonly pageBriefService = new PageBriefService(),
    private readonly evidenceService = new RequiredEvidenceService(),
    private readonly outlineService = new RecommendedOutlineService(),
    private readonly faqService = new FaqRecommendationService(),
    private readonly serpRequirementService = new SerpRequirementService(),
    private readonly linkingHintService = new InternalLinkingHintService(),
    private readonly constraintService = new GenerationConstraintService(),
  ) {}

  build(request: SeoPackRequest): SeoPack {
    const normalized = this.inputService.normalize(request);
    const pageType =
      request.profile ??
      normalized.selectedCandidate?.recommendedPageType ??
      DEFAULT_SEO_PACK_PROFILE;
    const requiredEntities = this.evidenceService.requiredEntities(request);
    const requiredFacts = this.evidenceService.requiredFacts(request);
    const pageBrief = this.pageBriefService.build(
      { ...request, profile: pageType },
      normalized.selectedCandidate,
    );
    const recommendedOutline = this.outlineService.build(
      { ...request, profile: pageType },
      requiredEntities,
      requiredFacts,
    );
    const faqRecommendations = this.faqService.build(request, requiredFacts);
    const mandatorySerpIntents =
      this.serpRequirementService.mandatoryIntents(request);
    const opportunityIntents =
      this.serpRequirementService.opportunityIntents(request);
    const serpExpectations =
      this.serpRequirementService.serpExpectations(request);
    const competitorInsights =
      this.serpRequirementService.competitorInsights(request);
    const internalLinkingHints = this.linkingHintService.build(
      request,
      requiredEntities,
    );
    const generationConstraints = this.constraintService.build(
      request,
      requiredFacts,
    );

    const uncertainty = this.uncertainty(request, normalized.warnings, requiredFacts);

    return {
      packKey: this.packKey(request.topicId, request.candidateKey, pageType),
      topicId: request.topicId,
      candidateKey: request.candidateKey,
      pageType,
      language: request.language,
      geo: request.geo,
      pageBrief,
      recommendedOutline,
      faqRecommendations,
      requiredEntities,
      requiredFacts,
      mandatorySerpIntents,
      opportunityIntents,
      serpExpectations,
      competitorInsights,
      internalLinkingHints,
      generationConstraints,
      sourceReferences: normalized.sourceReferences,
      uncertainty,
      warnings: normalized.warnings,
      degraded:
        normalized.degraded ||
        requiredFacts.some((fact) => fact.requiresMoreResearch) ||
        recommendedOutline.some((section) => section.warnings.length > 0),
      sourcePackReferences: normalized.sourcePackReferences,
      ruleVersion: request.ruleVersion ?? DEFAULT_SEO_PACK_RULE_VERSION,
    };
  }

  private uncertainty(
    request: SeoPackRequest,
    warnings: string[],
    requiredFacts: ReturnType<RequiredEvidenceService['requiredFacts']>,
  ): SeoPackUncertainty {
    return {
      evidenceGaps: request.knowledgePack?.evidenceGaps ?? [],
      unresolvedConflicts: requiredFacts
        .filter((fact) => fact.unresolvedConflict)
        .map((fact) => fact.statement),
      weakEvidenceWarnings: requiredFacts
        .filter((fact) => fact.requiresMoreResearch)
        .map((fact) => `Weak or unresolved fact: ${fact.statement}`),
      missingPackWarnings: warnings.filter((warning) =>
        warning.startsWith('SEO Pack built without'),
      ),
    };
  }

  private packKey(topicId: string, candidateKey: string, pageType: string): string {
    return `${topicId}:${candidateKey}:${pageType}`;
  }
}
