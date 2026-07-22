import {
  SerpContentDepthSummary,
  SerpPageEvidence,
  SerpRangeSummary,
} from './domain/serp-intelligence-types';

export class ContentDepthService {
  summarize(pages: SerpPageEvidence[]): SerpContentDepthSummary {
    return {
      wordCount: summarizeNumbers(pages.map((page) => page.wordCount)),
      sectionCount: summarizeNumbers(
        pages.map((page) => page.headings.filter((heading) => heading.level <= 3).length),
      ),
      faqCount: summarizeNumbers(
        pages.map((page) => (page.faqQuestions ?? []).length),
      ),
      tableUsageRatio: ratio(pages, (page) => (page.tableCount ?? 0) > 0),
      listUsageRatio: ratio(pages, (page) => (page.listCount ?? 0) > 0),
      comparisonUsageRatio: ratio(
        pages,
        (page) => (page.comparisonCount ?? 0) > 0,
      ),
      sampleSize: pages.length,
    };
  }
}

function summarizeNumbers(
  values: Array<number | null | undefined>,
): SerpRangeSummary {
  const numbers = values
    .filter((value): value is number => typeof value === 'number')
    .sort((a, b) => a - b);

  if (numbers.length === 0) {
    return { min: null, median: null, max: null };
  }

  return {
    min: numbers[0],
    median: numbers[Math.floor(numbers.length / 2)],
    max: numbers[numbers.length - 1],
  };
}

function ratio(
  pages: SerpPageEvidence[],
  predicate: (page: SerpPageEvidence) => boolean,
): number {
  if (pages.length === 0) {
    return 0;
  }
  return pages.filter(predicate).length / pages.length;
}
