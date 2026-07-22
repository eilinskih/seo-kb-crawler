import {
  SerpFaqPattern,
  SerpPageEvidence,
  SerpResult,
} from './domain/serp-intelligence-types';
import { normalizeSerpText } from './normalize-serp-text';
import { resultReference } from './result-reference';

export class FaqPatternService {
  analyze(pages: SerpPageEvidence[], results: SerpResult[]): SerpFaqPattern[] {
    const resultById = new Map(results.map((result) => [result.id, result]));
    const groups = new Map<string, SerpFaqPattern>();

    for (const page of pages) {
      const questions = unique([
        ...(page.faqQuestions ?? []),
        ...page.headings
          .map((heading) => heading.text)
          .filter((text) => text.includes('?')),
      ]);
      for (const question of questions) {
        const normalizedQuestion = normalizeSerpText(question);
        if (!normalizedQuestion) {
          continue;
        }
        const current = groups.get(normalizedQuestion) ?? {
          normalizedQuestion,
          exampleQuestions: [],
          frequency: 0,
          sourceDiversity: 0,
          supportingResults: [],
        };
        current.frequency += 1;
        current.exampleQuestions = unique([...current.exampleQuestions, question]);
        current.supportingResults = mergeReferences(
          current.supportingResults,
          resultReference(page, resultById.get(page.resultId)),
        );
        current.sourceDiversity = distinctDomains(current.supportingResults);
        groups.set(normalizedQuestion, current);
      }
    }

    return [...groups.values()].sort(
      (a, b) =>
        b.sourceDiversity - a.sourceDiversity ||
        b.frequency - a.frequency ||
        a.normalizedQuestion.localeCompare(b.normalizedQuestion),
    );
  }
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
