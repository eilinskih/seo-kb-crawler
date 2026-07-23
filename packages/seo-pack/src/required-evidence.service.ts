import {
  SeoPackRequiredEntity,
  SeoPackRequiredFact,
  SeoPackRequest,
} from './domain/seo-pack-types';

export class RequiredEvidenceService {
  requiredEntities(request: SeoPackRequest): SeoPackRequiredEntity[] {
    return (request.knowledgePack?.entities ?? [])
      .map((entity) => ({
        entityId: entity.entityId,
        label: entity.label,
        type: entity.type ?? null,
        aliases: entity.aliases ?? [],
        confidence: entity.confidence ?? 'unknown',
        sourceReferences: entity.sourceReferences ?? [],
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  requiredFacts(request: SeoPackRequest): SeoPackRequiredFact[] {
    return (request.knowledgePack?.facts ?? [])
      .map((fact) => ({
        factId: fact.factId,
        statement: fact.statement,
        entityIds: fact.entityIds ?? [],
        confidence: fact.confidence ?? 'unknown',
        sourceReferences: fact.sourceReferences ?? [],
        unresolvedConflict: Boolean(fact.unresolvedConflict),
        requiresMoreResearch:
          Boolean(fact.unresolvedConflict) ||
          fact.confidence === 'unknown' ||
          fact.confidence === 'low',
      }))
      .sort((a, b) => a.factId.localeCompare(b.factId));
  }
}
