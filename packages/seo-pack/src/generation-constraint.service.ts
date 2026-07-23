import {
  SeoPackGenerationConstraint,
  SeoPackRequest,
  SeoPackRequiredFact,
} from './domain/seo-pack-types';

export class GenerationConstraintService {
  build(
    request: SeoPackRequest,
    requiredFacts: SeoPackRequiredFact[],
  ): SeoPackGenerationConstraint[] {
    const constraints: SeoPackGenerationConstraint[] = [];

    for (const fact of requiredFacts) {
      const sourceIds = fact.sourceReferences.map((source) => source.sourceId);
      if (fact.requiresMoreResearch) {
        constraints.push({
          code: fact.unresolvedConflict
            ? 'resolve_conflict_before_claim'
            : 'do_not_assert_weak_fact',
          detail: fact.unresolvedConflict
            ? `Resolve conflict before asserting: ${fact.statement}`
            : `Do not assert weak fact without more evidence: ${fact.statement}`,
          sourceIds,
          blocking: fact.unresolvedConflict,
        });
      } else {
        constraints.push({
          code: 'cite_required_fact',
          detail: `Cite required fact: ${fact.statement}`,
          sourceIds,
          blocking: false,
        });
      }
    }

    for (const intent of request.serpIntentPack?.intents ?? []) {
      if (intent.priority === 'mandatory') {
        constraints.push({
          code: 'cover_required_intent',
          detail: `Cover required intent: ${intent.label}`,
          sourceIds: intent.supportingIds ?? [],
          blocking: false,
        });
      }

      if (intent.priority === 'opportunity') {
        constraints.push({
          code: 'consider_opportunity_intent',
          detail: `Consider opportunity intent: ${intent.label}`,
          sourceIds: intent.supportingIds ?? [],
          blocking: false,
        });
      }
    }

    if (request.language || request.geo) {
      constraints.push({
        code: 'respect_language_geo',
        detail: 'Respect requested language and geographic context.',
        sourceIds: [],
        blocking: false,
      });
    }

    return constraints;
  }
}
