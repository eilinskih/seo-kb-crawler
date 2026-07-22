import {
  SerpEntityPattern,
  SerpPageEvidence,
  SerpResult,
} from './domain/serp-intelligence-types';
import { normalizeSerpText } from './normalize-serp-text';
import { resultReference } from './result-reference';

export class EntityPatternService {
  analyze(
    pages: SerpPageEvidence[],
    results: SerpResult[],
  ): SerpEntityPattern[] {
    const resultById = new Map(results.map((result) => [result.id, result]));
    const groups = new Map<string, SerpEntityPattern>();

    for (const page of pages) {
      for (const entity of page.entities ?? []) {
        const normalized = normalizeSerpText(entity.canonicalName);
        if (!normalized) {
          continue;
        }
        const key = `${entity.entityType ?? 'unknown'}:${normalized}`;
        const current = groups.get(key) ?? {
          canonicalName: entity.canonicalName,
          entityType: entity.entityType ?? null,
          frequency: 0,
          sourceDiversity: 0,
          supportingResults: [],
        };
        current.frequency += 1;
        current.supportingResults = mergeReferences(
          current.supportingResults,
          resultReference(page, resultById.get(page.resultId)),
        );
        current.sourceDiversity = distinctDomains(current.supportingResults);
        groups.set(key, current);
      }
    }

    return [...groups.values()].sort(
      (a, b) =>
        b.sourceDiversity - a.sourceDiversity ||
        b.frequency - a.frequency ||
        a.canonicalName.localeCompare(b.canonicalName),
    );
  }
}

function mergeReferences<T extends { resultId: string }>(
  values: T[],
  next: T,
): T[] {
  return values.some((value) => value.resultId === next.resultId)
    ? values
    : [...values, next];
}

function distinctDomains(values: { domain: string | null }[]): number {
  return new Set(values.map((value) => value.domain ?? 'unknown')).size;
}
