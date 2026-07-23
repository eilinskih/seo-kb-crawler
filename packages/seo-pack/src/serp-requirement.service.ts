import {
  SeoPackCompetitorInsight,
  SeoPackRequest,
  SeoPackSerpRequirement,
} from './domain/seo-pack-types';

export class SerpRequirementService {
  mandatoryIntents(request: SeoPackRequest): SeoPackSerpRequirement[] {
    return this.intentRequirements(request, 'mandatory');
  }

  opportunityIntents(request: SeoPackRequest): SeoPackSerpRequirement[] {
    return this.intentRequirements(request, 'opportunity');
  }

  serpExpectations(request: SeoPackRequest): SeoPackSerpRequirement[] {
    const expectations: SeoPackSerpRequirement[] = [];
    const serpPackDegraded = Boolean(request.serpPack?.degraded);
    if (request.serpPack?.contentDepthExpectation) {
      expectations.push({
        requirementKey: 'content-depth',
        label: request.serpPack.contentDepthExpectation,
        priority: 'recommended',
        confidence: serpPackDegraded ? 'low' : 'medium',
        sourceReferences: [],
        warnings: serpPackDegraded
          ? ['Content depth expectation comes from degraded SERP evidence']
          : [],
      });
    }

    for (const hint of request.serpPack?.serpFeatureHints ?? []) {
      expectations.push({
        requirementKey: `serp-feature:${this.slug(hint)}`,
        label: hint,
        priority: 'recommended',
        confidence: serpPackDegraded ? 'low' : 'medium',
        sourceReferences: [],
        warnings: [],
      });
    }

    return expectations;
  }

  competitorInsights(request: SeoPackRequest): SeoPackCompetitorInsight[] {
    return (request.serpPack?.competitorInsights ?? []).map((insight) => ({
      insight: insight.insight,
      confidence: insight.confidence ?? 'unknown',
      sourceReferences: insight.sourceReferences ?? [],
    }));
  }

  private intentRequirements(
    request: SeoPackRequest,
    priority: 'mandatory' | 'opportunity',
  ): SeoPackSerpRequirement[] {
    return (request.serpIntentPack?.intents ?? [])
      .filter((intent) => intent.priority === priority)
      .map((intent) => ({
        requirementKey: `intent:${intent.intentId}`,
        label: intent.label,
        priority: intent.priority,
        confidence: intent.confidence ?? 'unknown',
        sourceReferences: [],
        warnings:
          request.serpIntentPack?.degraded && priority === 'mandatory'
            ? ['Mandatory intent comes from degraded SERP Intent Pack']
            : [],
      }));
  }

  private slug(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}
