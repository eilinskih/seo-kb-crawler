import {
  SeoPackFaqRecommendation,
  SeoPackRequest,
  SeoPackRequiredFact,
} from './domain/seo-pack-types';

export class FaqRecommendationService {
  build(
    request: SeoPackRequest,
    requiredFacts: SeoPackRequiredFact[],
  ): SeoPackFaqRecommendation[] {
    const fromSerp = (request.serpPack?.faqQuestions ?? []).map((faq) => ({
      question: faq.question,
      intentId: null,
      priority: 'recommended' as const,
      requiredFactIds: requiredFacts.slice(0, 3).map((fact) => fact.factId),
      sourceReferences: faq.sourceReferences ?? [],
      confidence: faq.confidence ?? 'unknown',
      unresolvedEvidenceGaps: request.knowledgePack?.evidenceGaps ?? [],
    }));

    const fromIntent = (request.serpIntentPack?.intents ?? [])
      .filter((intent) => intent.question)
      .map((intent) => ({
        question: intent.question as string,
        intentId: intent.intentId,
        priority: intent.priority,
        requiredFactIds: requiredFacts.slice(0, 3).map((fact) => fact.factId),
        sourceReferences: [],
        confidence: intent.confidence ?? 'unknown',
        unresolvedEvidenceGaps: request.knowledgePack?.evidenceGaps ?? [],
      }));

    const fromLongTail = (request.longTailDiscoveryPack?.questionCandidates ?? []).map(
      (question) => ({
        question,
        intentId: null,
        priority: 'opportunity' as const,
        requiredFactIds: [],
        sourceReferences: [],
        confidence: 'low' as const,
        unresolvedEvidenceGaps: request.knowledgePack?.evidenceGaps ?? [],
      }),
    );

    return [...fromSerp, ...fromIntent, ...fromLongTail].filter(
      (faq, index, all) =>
        all.findIndex((candidate) => candidate.question === faq.question) === index,
    );
  }
}
