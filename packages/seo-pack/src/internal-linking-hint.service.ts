import {
  SeoPackInternalLinkingHint,
  SeoPackRequest,
  SeoPackRequiredEntity,
} from './domain/seo-pack-types';

export class InternalLinkingHintService {
  build(
    request: SeoPackRequest,
    requiredEntities: SeoPackRequiredEntity[],
  ): SeoPackInternalLinkingHint[] {
    const labels = [
      ...(request.topicExpansionPack?.candidateLabels ?? []),
      ...(request.longTailDiscoveryPack?.candidateLabels ?? []),
    ];

    return labels.slice(0, 8).map((label) => ({
      sourcePageCandidate: null,
      targetPageCandidate: label,
      anchorConcept: label.toLowerCase(),
      relatedEntityIds: requiredEntities.slice(0, 3).map((entity) => entity.entityId),
      relatedTopicIds: [request.topicId],
      confidence: 'low',
      reason: 'Internal linking hint derived from related topic opportunity.',
    }));
  }
}
