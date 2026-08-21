import { DemandEvidenceType, DemandObservation } from './domain/demand-engine-types';
import { normalizeKeyword } from './normalize-keyword';

export interface CompetitorContentEvidenceDocument {
  url: string;
  title?: string | null;
  metaDescription?: string | null;
  headings?: Array<{ level?: number; text?: string | null }>;
  bodyText?: string | null;
  breadcrumbs?: string[];
  anchors?: string[];
  faqQuestions?: string[];
}

export interface CompetitorContentEvidenceRequest {
  topicSeed: string;
  documents: CompetitorContentEvidenceDocument[];
  limit?: number;
}

const DEFAULT_LIMIT = 250;
const MAX_PHRASES_PER_FIELD = 12;
const MAX_BODY_CHARS = 12_000;
const MIN_TOKEN_COUNT = 2;
const MAX_TOKEN_COUNT = 8;

const BOILERPLATE_PATTERNS = [
  /\b(niska cena|największy wybór|najwiekszy wybor|zróżnicowany zbiór ofert|zroznicowany zbior ofert)\b/iu,
  /\b(wejdź i znajdź|wejdz i znajdz|sprawdź oferty|sprawdz oferty|kupuj taniej)\b/iu,
  /\b(add to cart|buy now|shop now|find what you are looking for|best prices)\b/iu,
  /\b(cookie|privacy policy|polityka prywatności|regulamin|logowanie|rejestracja)\b/iu,
];

const HARD_STOPWORDS = new Set([
  'i',
  'o',
  'oraz',
  'and',
  'lub',
  'or',
  'czy',
  'the',
  'dla',
  'do',
  'with',
  'z',
  'ze',
  'w',
  'we',
  'na',
]);

const LEADING_ACTION_WORDS = /^(wybierz|wybierzcie|sprawdź|sprawdz|zobacz|kup|find|choose|shop)\s+/iu;

export function competitorContentEvidenceObservations(
  request: CompetitorContentEvidenceRequest,
): DemandObservation[] {
  const seedTokens = meaningfulTokens(request.topicSeed);
  if (seedTokens.size === 0) {
    return [];
  }

  const observations: DemandObservation[] = [];
  for (const document of request.documents) {
    observations.push(
      ...fieldObservations({
        values: [document.title],
        evidenceType: 'competitor_title',
        document,
        topicSeed: request.topicSeed,
        seedTokens,
      }),
      ...fieldObservations({
        values: [document.metaDescription],
        evidenceType: 'competitor_meta',
        document,
        topicSeed: request.topicSeed,
        seedTokens,
      }),
      ...fieldObservations({
        values: (document.headings ?? []).map((heading) => heading.text),
        evidenceType: 'competitor_heading',
        document,
        topicSeed: request.topicSeed,
        seedTokens,
      }),
      ...fieldObservations({
        values: document.breadcrumbs ?? [],
        evidenceType: 'competitor_breadcrumb',
        document,
        topicSeed: request.topicSeed,
        seedTokens,
      }),
      ...fieldObservations({
        values: document.anchors ?? [],
        evidenceType: 'competitor_anchor',
        document,
        topicSeed: request.topicSeed,
        seedTokens,
      }),
      ...fieldObservations({
        values: bodyFragments(document.bodyText),
        evidenceType: 'competitor_body_phrase',
        document,
        topicSeed: request.topicSeed,
        seedTokens,
      }),
      ...fieldObservations({
        values: document.faqQuestions ?? [],
        evidenceType: 'faq_block',
        document,
        topicSeed: request.topicSeed,
        seedTokens,
      }),
    );
  }

  return uniqueObservations(observations).slice(0, request.limit ?? DEFAULT_LIMIT);
}

function fieldObservations(options: {
  values: Array<string | null | undefined>;
  evidenceType: DemandEvidenceType;
  document: CompetitorContentEvidenceDocument;
  topicSeed: string;
  seedTokens: Set<string>;
}): DemandObservation[] {
  return options.values
    .flatMap((value) => competitorPhrases(value, options.seedTokens))
    .slice(0, MAX_PHRASES_PER_FIELD)
    .map((phrase) => ({
      observedText: phrase,
      sourceTier: 'owned_data' as const,
      providerKey: 'competitor_content_evidence',
      evidenceType: options.evidenceType,
      sourceQuery: options.topicSeed,
      evidenceUrl: options.document.url,
    }));
}

export function competitorPhrases(
  value: string | null | undefined,
  seedTokens: Set<string>,
): string[] {
  if (!value) {
    return [];
  }
  const phrases: string[] = [];
  for (const segment of splitSegments(value)) {
    const cleaned = cleanPhrase(segment);
    if (!isUsefulPhrase(cleaned, seedTokens)) {
      continue;
    }
    if (startsWithSeedFamily(cleaned, seedTokens)) {
      phrases.push(cleaned);
    }
    phrases.push(...seedAnchoredSubphrases(cleaned, seedTokens));
  }
  return unique(phrases);
}

function splitSegments(value: string): string[] {
  return value
    .replace(/\s+[–—-]\s+/gu, '|')
    .split(/[|:;,\n()\[\]{}<>!?]/u)
    .flatMap((part) => part.split(/\s{2,}/u))
    .map((part) => part.trim())
    .filter(Boolean);
}

function cleanPhrase(value: string): string {
  return value
    .replace(LEADING_ACTION_WORDS, '')
    .replace(/\b(19|20)\d{2}\b/gu, '')
    .replace(/[™®©]/gu, '')
    .replace(/[.,]+$/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function isUsefulPhrase(value: string, seedTokens: Set<string>): boolean {
  const normalized = normalizeKeyword(value);
  if (!normalized || looksLikeBoilerplate(normalized)) {
    return false;
  }
  const tokens = tokenTexts(normalized);
  return tokens.length >= MIN_TOKEN_COUNT &&
    tokens.length <= MAX_TOKEN_COUNT &&
    hasAnySeedOverlap(tokens, seedTokens);
}

function seedAnchoredSubphrases(value: string, seedTokens: Set<string>): string[] {
  const tokens = tokenTexts(value);
  const phrases: string[] = [];
  for (const [index, token] of tokens.entries()) {
    if (!seedTokens.has(canonicalToken(token))) {
      continue;
    }
    for (let length = MIN_TOKEN_COUNT; length <= Math.min(MAX_TOKEN_COUNT, tokens.length - index); length += 1) {
      const window = tokens.slice(index, index + length);
      if (window.slice(1).some((candidate) => HARD_STOPWORDS.has(candidate))) {
        break;
      }
      const phrase = window.join(' ');
      if (isUsefulPhrase(phrase, seedTokens)) {
        phrases.push(phrase);
      }
    }
  }
  return phrases;
}

function bodyFragments(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .slice(0, MAX_BODY_CHARS)
    .split(/[\r\n.]/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function looksLikeBoilerplate(value: string): boolean {
  return BOILERPLATE_PATTERNS.some((pattern) => pattern.test(value));
}

function meaningfulTokens(value: string): Set<string> {
  return new Set(tokenTexts(value)
    .map(canonicalToken)
    .filter((token) => token.length >= 3));
}

function tokenTexts(value: string): string[] {
  return normalizeKeyword(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .split(/[^a-z0-9ąćęłńóśźż]+/iu)
    .map((token) => token.trim())
    .filter(Boolean);
}

function hasAnySeedOverlap(tokens: string[], seedTokens: Set<string>): boolean {
  return tokens.some((token) => seedTokens.has(canonicalToken(token)));
}

function startsWithSeedFamily(value: string, seedTokens: Set<string>): boolean {
  const first = tokenTexts(value)[0];
  return first ? seedTokens.has(canonicalToken(first)) : false;
}

function canonicalToken(value: string): string {
  const token = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '');
  if (token.length <= 4) {
    return token;
  }
  return token
    .replace(/(owego|owej|owych|ami|ach|owe|owa|owy|ego|iej|ie|em|om|ow|ą|a|e|i|y)$/u, '');
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function uniqueObservations(values: DemandObservation[]): DemandObservation[] {
  const seen = new Set<string>();
  const result: DemandObservation[] = [];
  for (const value of values) {
    const key = [
      normalizeKeyword(value.observedText),
      value.evidenceType,
      value.evidenceUrl ?? '',
    ].join('|');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }
  return result;
}
