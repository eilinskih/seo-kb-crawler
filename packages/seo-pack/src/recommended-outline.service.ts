import {
  SeoPackOutlineSection,
  SeoPackRequest,
  SeoPackRequiredEntity,
  SeoPackRequiredFact,
} from './domain/seo-pack-types';
import { SEO_PACK_PROFILE_PURPOSE } from './seo-pack-defaults';

export class RecommendedOutlineService {
  build(
    request: SeoPackRequest,
    requiredEntities: SeoPackRequiredEntity[],
    requiredFacts: SeoPackRequiredFact[],
  ): SeoPackOutlineSection[] {
    const sections: SeoPackOutlineSection[] = [];
    const profile = request.profile ?? 'guide';

    sections.push({
      sectionKey: 'overview',
      headingSuggestion: this.toHeading(
        request.demandPack?.primaryKeyword ?? request.candidateKey,
      ),
      purpose: SEO_PACK_PROFILE_PURPOSE[profile],
      mappedIntentIds: this.intentIds(request, ['mandatory', 'recommended']),
      requiredEntityIds: requiredEntities.slice(0, 5).map((entity) => entity.entityId),
      requiredFactIds: requiredFacts.slice(0, 5).map((fact) => fact.factId),
      sourceReferences: requiredFacts.flatMap((fact) => fact.sourceReferences).slice(0, 5),
      confidence: requiredFacts.length > 0 ? 'medium' : 'low',
      warnings:
        requiredFacts.length === 0
          ? ['Outline built without Knowledge Pack facts']
          : [],
    });

    for (const intent of request.serpIntentPack?.intents ?? []) {
      if (intent.priority === 'mandatory' || intent.priority === 'opportunity') {
        sections.push({
          sectionKey: `intent:${intent.intentId}`,
          headingSuggestion: this.toHeading(intent.label),
          purpose:
            intent.priority === 'mandatory'
              ? 'Cover a mandatory SERP intent.'
              : 'Cover an opportunity intent when evidence supports it.',
          mappedIntentIds: [intent.intentId],
          requiredEntityIds: [],
          requiredFactIds: requiredFacts
            .filter((fact) => fact.confidence !== 'unknown')
            .slice(0, 3)
            .map((fact) => fact.factId),
          sourceReferences: [],
          confidence: intent.confidence ?? 'unknown',
          warnings: [],
        });
      }
    }

    for (const heading of request.serpPack?.headings ?? []) {
      sections.push({
        sectionKey: `serp-heading:${this.slug(heading.heading)}`,
        headingSuggestion: this.toHeading(heading.heading),
        purpose: 'Reflect a recurring SERP heading theme.',
        mappedIntentIds: [],
        requiredEntityIds: [],
        requiredFactIds: [],
        sourceReferences: heading.sourceReferences ?? [],
        confidence: heading.frequency && heading.frequency > 1 ? 'medium' : 'low',
        warnings: [],
      });
    }

    return this.uniqueByKey(sections).slice(0, 12);
  }

  private intentIds(
    request: SeoPackRequest,
    priorities: Array<'mandatory' | 'recommended' | 'opportunity' | 'monitor'>,
  ): string[] {
    return (request.serpIntentPack?.intents ?? [])
      .filter((intent) => priorities.includes(intent.priority))
      .map((intent) => intent.intentId);
  }

  private toHeading(value: string): string {
    return value
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(' ');
  }

  private slug(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  private uniqueByKey(sections: SeoPackOutlineSection[]): SeoPackOutlineSection[] {
    return sections.filter(
      (section, index, all) =>
        all.findIndex((candidate) => candidate.sectionKey === section.sectionKey) ===
        index,
    );
  }
}
