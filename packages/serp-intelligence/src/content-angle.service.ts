import {
  SerpAngleSummary,
  SerpContentAngle,
  SerpPageEvidence,
  SerpResult,
} from './domain/serp-intelligence-types';
import { normalizeSerpText } from './normalize-serp-text';

const ANGLES: SerpContentAngle[] = [
  'informational',
  'commercial',
  'local',
  'guide',
  'review',
  'comparison',
  'tutorial',
  'navigational',
  'mixed',
  'unknown',
];

const KEYWORDS: Record<Exclude<SerpContentAngle, 'mixed' | 'unknown'>, string[]> = {
  informational: ['what is', 'why', 'benefits', 'risks', 'faq'],
  commercial: ['price', 'cost', 'buy', 'deal', 'service', 'near me'],
  local: ['near me', 'city', 'clinic', 'address', 'map', 'local'],
  guide: ['guide', 'how to', 'steps', 'complete', 'ultimate'],
  review: ['review', 'best', 'top', 'rating', 'pros and cons'],
  comparison: [' vs ', 'versus', 'compare', 'comparison', 'alternative'],
  tutorial: ['tutorial', 'learn', 'setup', 'install', 'example'],
  navigational: ['login', 'official', 'homepage', 'contact'],
};

export class ContentAngleService {
  detect(pages: SerpPageEvidence[], results: SerpResult[]): SerpAngleSummary {
    const scores = initialScores();

    for (const text of observableTexts(pages, results)) {
      for (const [angle, keywords] of Object.entries(KEYWORDS) as Array<
        [Exclude<SerpContentAngle, 'mixed' | 'unknown'>, string[]]
      >) {
        for (const keyword of keywords) {
          if (text.includes(keyword)) {
            scores[angle] += 1;
          }
        }
      }
    }

    const ranked = ANGLES
      .filter((angle) => angle !== 'mixed' && angle !== 'unknown')
      .sort((a, b) => scores[b] - scores[a]);
    const positive = ranked.filter((angle) => scores[angle] > 0);

    if (positive.length === 0) {
      return {
        dominantAngle: 'unknown',
        secondaryAngles: [],
        scores,
      };
    }

    const [first, second, ...rest] = positive;
    const dominantAngle =
      second && scores[first] === scores[second] ? 'mixed' : first;

    return {
      dominantAngle,
      secondaryAngles: dominantAngle === 'mixed' ? [first, second, ...rest] : positive.slice(1),
      scores,
    };
  }
}

function observableTexts(
  pages: SerpPageEvidence[],
  results: SerpResult[],
): string[] {
  return [
    ...results.flatMap((result) => [result.title, result.snippet, result.url]),
    ...pages.flatMap((page) => [
      page.title,
      page.snippet,
      page.url,
      ...page.headings.map((heading) => heading.text),
      ...(page.faqQuestions ?? []),
    ]),
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeSerpText);
}

function initialScores(): Record<SerpContentAngle, number> {
  return {
    informational: 0,
    commercial: 0,
    local: 0,
    guide: 0,
    review: 0,
    comparison: 0,
    tutorial: 0,
    navigational: 0,
    mixed: 0,
    unknown: 0,
  };
}
