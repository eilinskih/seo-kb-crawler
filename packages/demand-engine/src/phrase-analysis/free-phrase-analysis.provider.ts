import { normalizeKeyword } from '../normalize-keyword';
import {
  PhraseAnalysisProvider,
  PhraseAnalysisRequest,
  PhraseAnalysisResult,
  PhrasePredicateType,
  PhraseToken,
  PhraseTokenRole,
} from './phrase-analysis-types';

const SEARCH_EVIDENCE = new Set([
  'autocomplete',
  'people_also_ask',
  'related_search',
  'provider_keyword_metric',
]);

const OWNED_SERP_EVIDENCE = new Set([
  'serp_snippet',
  'competitor_title',
  'competitor_meta',
  'competitor_heading',
  'competitor_anchor',
  'competitor_breadcrumb',
  'competitor_body_phrase',
  'faq_block',
]);

const CONNECTOR_PREDICATES: Array<{
  words: string[];
  predicate: PhrasePredicateType;
}> = [
  { words: ['with', 'z', 'ze', 'mit', 'con', 'avec', 'com', 'met'], predicate: 'has_feature' },
  { words: ['for', 'dla', 'do', 'fur', 'für', 'para', 'pour', 'per', 'voor'], predicate: 'for_target' },
  { words: ['in', 'w', 'we', 'na', 'near', 'by', 'local', 'lokalnie'], predicate: 'near_location' },
  { words: ['price', 'cost', 'pricing', 'cena', 'cennik', 'koszt', 'precio', 'prix', 'preis'], predicate: 'price_intent' },
  { words: ['vs', 'versus', 'czy', 'better', 'lepsze', 'porównanie', 'vergleich'], predicate: 'comparison' },
  { words: ['review', 'reviews', 'opinie', 'recenzja', 'ranking'], predicate: 'review_intent' },
  { words: ['how', 'jak', 'what', 'co', 'czy', 'ile', 'when', 'kiedy', 'why', 'dlaczego'], predicate: 'question' },
];

const LOW_QUALITY_PATTERNS = [
  /\b(add to cart|buy now|shipping|delivery|in stock|out of stock)\b/u,
  /\b(dodaj do koszyka|kup teraz|dostawa|wysyłka|w magazynie|brak w magazynie)\b/u,
  /\b(cookie|privacy policy|terms|login|register)\b/u,
];

const MODEL_OR_SKU_PATTERNS = [
  /\b[a-z]{1,6}\d[a-z0-9-]*\b/iu,
  /\b\d+[a-z][a-z0-9-]*\b/iu,
  /\b[a-z0-9]{1,6}-[a-z0-9-]*\d[a-z0-9-]*\b/iu,
];

const MEASUREMENT_PATTERN = /\b\d+(?:[,.]\d+)?\s*(?:x|×)\s*\d+(?:[,.]\d+)?(?:\s*(?:x|×)\s*\d+(?:[,.]\d+)?)?\s*(?:cm|mm|m|in|inch|")?\b/iu;

export class FreePhraseAnalysisProvider implements PhraseAnalysisProvider {
  readonly providerKey = 'free_structural_phrase_analysis';

  async analyze(request: PhraseAnalysisRequest): Promise<PhraseAnalysisResult> {
    const normalizedPhrase = normalizeKeyword(request.phrase);
    const normalizedTopic = normalizeKeyword(request.topicSeed);
    const tokens = tokenize(normalizedPhrase);
    const topicTokens = new Set(tokenize(normalizedTopic).map((token) =>
      canonicalToken(token.normalizedText),
    ));
    const evidenceTypes = new Set(request.evidenceTypes);
    const predicates = predicatesForPhrase(tokens);
    const reasons: string[] = [];

    const hasSearchEvidence = request.evidenceTypes.some((type) =>
      SEARCH_EVIDENCE.has(type),
    );
    const hasOwnedSerpEvidence = request.evidenceTypes.some((type) =>
      OWNED_SERP_EVIDENCE.has(type),
    );
    const hasModelOrSku = MODEL_OR_SKU_PATTERNS.some((pattern) =>
      pattern.test(normalizedPhrase),
    );
    const hasMeasurement = MEASUREMENT_PATTERN.test(normalizedPhrase);
    const overlapCount = tokens.filter((token) =>
      topicTokens.has(canonicalToken(token.normalizedText)),
    ).length;
    const overlapRatio = tokens.length === 0 ? 0 : overlapCount / tokens.length;
    const lowQuality = LOW_QUALITY_PATTERNS.some((pattern) =>
      pattern.test(normalizedPhrase),
    ) || tokens.length > 10;

    if (lowQuality) {
      reasons.push('phrase looks like page chrome, inventory copy, or a long snippet');
    }
    if (hasModelOrSku) {
      reasons.push('phrase contains model/SKU-like token');
    }
    if (hasMeasurement) {
      reasons.push('phrase contains exact measurement');
    }
    if (hasSearchEvidence) {
      reasons.push('phrase has direct search-demand evidence');
    }
    if (hasOwnedSerpEvidence) {
      reasons.push('phrase was observed in SERP or competitor content');
    }
    if (overlapCount > 0) {
      reasons.push('phrase overlaps the topic seed');
    }

    tokens.forEach((token) => {
      token.role = tokenRole(token, topicTokens);
    });

    const objectTokenIndexes = tokens
      .filter((token) => token.role === 'object')
      .map((token) => token.index);
    const modifierTokenIndexes = tokens
      .filter((token) =>
        token.role === 'modifier' ||
        token.role === 'model_or_sku' ||
        token.role === 'measurement',
      )
      .map((token) => token.index);

    const candidateKind = decideCandidateKind({
      lowQuality,
      hasModelOrSku,
      hasMeasurement,
      hasSearchEvidence,
      hasOwnedSerpEvidence,
      hasPredicates: predicates.length > 0,
      tokensLength: tokens.length,
      overlapRatio,
      normalizedPhrase,
      normalizedTopic,
    });

    return {
      providerKey: this.providerKey,
      candidateKind,
      confidence: confidenceForKind(candidateKind, hasSearchEvidence, hasOwnedSerpEvidence),
      objectSpan: objectTokenIndexes.length > 0
        ? spanFromTokenIndexes(tokens, objectTokenIndexes)
        : undefined,
      modifierSpans: modifierTokenIndexes.length > 0
        ? [spanFromTokenIndexes(tokens, modifierTokenIndexes)]
        : [],
      predicates: predicates.length > 0 ? predicates : ['unclassified'],
      tokens,
      reasons,
    };
  }
}

function tokenize(value: string): PhraseToken[] {
  return value
    .split(/\s+/u)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((text, index) => ({
      text,
      normalizedText: normalizeKeyword(text),
      index,
      role: 'unknown' as PhraseTokenRole,
    }));
}

function predicatesForPhrase(tokens: PhraseToken[]): PhrasePredicateType[] {
  const tokenSet = new Set(tokens.map((token) => token.normalizedText));
  return CONNECTOR_PREDICATES
    .filter((connector) =>
      connector.words.some((word) => tokenSet.has(normalizeKeyword(word))),
    )
    .map((connector) => connector.predicate)
    .filter((predicate, index, predicates) =>
      predicates.indexOf(predicate) === index,
    );
}

function tokenRole(token: PhraseToken, topicTokens: Set<string>): PhraseTokenRole {
  if (topicTokens.has(canonicalToken(token.normalizedText))) {
    return 'object';
  }
  if (CONNECTOR_PREDICATES.some((connector) =>
    connector.words.some((word) => normalizeKeyword(word) === token.normalizedText),
  )) {
    return 'connector';
  }
  if (MODEL_OR_SKU_PATTERNS.some((pattern) => pattern.test(token.normalizedText))) {
    return 'model_or_sku';
  }
  if (/^\d+(?:[,.]\d+)?$/u.test(token.normalizedText)) {
    return 'measurement';
  }
  return 'modifier';
}

function canonicalToken(value: string): string {
  const token = normalizeKeyword(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '');
  if (token.length <= 4) {
    return token;
  }
  return token
    .replace(/(owego|owej|owych|ami|ach|owe|owa|owy|ego|iej|ie|em|om|ow|ą|a|e|i|y)$/u, '');
}

function decideCandidateKind(input: {
  lowQuality: boolean;
  hasModelOrSku: boolean;
  hasMeasurement: boolean;
  hasSearchEvidence: boolean;
  hasOwnedSerpEvidence: boolean;
  hasPredicates: boolean;
  tokensLength: number;
  overlapRatio: number;
  normalizedPhrase: string;
  normalizedTopic: string;
}) {
  if (input.lowQuality) {
    return 'low_quality_snippet' as const;
  }
  if (input.normalizedPhrase === input.normalizedTopic) {
    return 'page_cluster' as const;
  }
  if ((input.hasModelOrSku || input.hasMeasurement) && !input.hasSearchEvidence) {
    return 'product_or_instance' as const;
  }
  if (input.hasSearchEvidence) {
    return 'page_cluster' as const;
  }
  if (input.hasOwnedSerpEvidence && input.overlapRatio >= 0.5 && input.tokensLength <= 6) {
    return 'page_cluster' as const;
  }
  if (input.hasOwnedSerpEvidence && input.hasPredicates && input.overlapRatio >= 0.35) {
    return 'page_cluster' as const;
  }
  if (input.hasOwnedSerpEvidence) {
    return 'pending' as const;
  }
  return 'pending' as const;
}

function confidenceForKind(
  candidateKind: ReturnType<typeof decideCandidateKind>,
  hasSearchEvidence: boolean,
  hasOwnedSerpEvidence: boolean,
): PhraseAnalysisResult['confidence'] {
  if (candidateKind === 'page_cluster' && hasSearchEvidence) {
    return 'high';
  }
  if (candidateKind === 'page_cluster' && hasOwnedSerpEvidence) {
    return 'medium';
  }
  if (candidateKind === 'product_or_instance' || candidateKind === 'low_quality_snippet') {
    return 'medium';
  }
  return 'low';
}

function spanFromTokenIndexes(tokens: PhraseToken[], indexes: number[]) {
  const indexSet = new Set(indexes);
  const selected = tokens.filter((token) => indexSet.has(token.index));
  return {
    text: selected.map((token) => token.text).join(' '),
    tokenIndexes: selected.map((token) => token.index),
  };
}
