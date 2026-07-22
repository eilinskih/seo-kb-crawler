import {
  SerpHeadingPattern,
  SerpPageEvidence,
  SerpResult,
} from './domain/serp-intelligence-types';
import { normalizeSerpText } from './normalize-serp-text';
import { resultReference } from './result-reference';

export class HeadingPatternService {
  analyze(
    pages: SerpPageEvidence[],
    results: SerpResult[],
  ): SerpHeadingPattern[] {
    const resultById = new Map(results.map((result) => [result.id, result]));
    const groups = new Map<string, SerpHeadingPattern>();

    for (const page of pages) {
      for (const heading of page.headings) {
        if (heading.level > 3) {
          continue;
        }
        const normalizedHeading = normalizeSerpText(heading.text);
        if (!normalizedHeading) {
          continue;
        }
        const key = `${heading.level}:${normalizedHeading}`;
        const current = groups.get(key) ?? {
          normalizedHeading,
          exampleTexts: [],
          headingLevel: heading.level,
          frequency: 0,
          sourceDiversity: 0,
          supportingResults: [],
        };
        current.frequency += 1;
        current.exampleTexts = unique([...current.exampleTexts, heading.text]);
        current.supportingResults = mergeReferences(
          current.supportingResults,
          resultReference(page, resultById.get(page.resultId)),
        );
        current.sourceDiversity = distinctDomains(current.supportingResults);
        groups.set(key, current);
      }
    }

    return [...groups.values()].sort(patternSort);
  }
}

function patternSort(a: SerpHeadingPattern, b: SerpHeadingPattern): number {
  return (
    b.sourceDiversity - a.sourceDiversity ||
    b.frequency - a.frequency ||
    a.headingLevel - b.headingLevel ||
    a.normalizedHeading.localeCompare(b.normalizedHeading)
  );
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
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
