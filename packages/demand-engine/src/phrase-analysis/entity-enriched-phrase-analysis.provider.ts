import type {
  ExternalEntityCandidate,
  ExternalEntityEnrichmentPack,
  ExternalEntityEnrichmentRequest,
} from '@seo-kb/external-entity-enrichment';
import { normalizeKeyword } from '../normalize-keyword';
import {
  PhraseAnalysisProvider,
  PhraseAnalysisRequest,
  PhraseAnalysisResult,
  PhraseEntityEvidence,
} from './phrase-analysis-types';
import { FreePhraseAnalysisProvider } from './free-phrase-analysis.provider';

export interface PhraseEntityEnrichmentService {
  enrich(
    request: ExternalEntityEnrichmentRequest,
  ): Promise<ExternalEntityEnrichmentPack>;
}

export interface EntityEnrichedPhraseAnalysisOptions {
  maxSpanTokens?: number;
  maxLookups?: number;
  minAcceptedConfidence?: ExternalEntityCandidate['confidence'];
  fallbackProvider?: PhraseAnalysisProvider;
}

const CONFIDENCE_RANK: Record<ExternalEntityCandidate['confidence'], number> = {
  unknown: 0,
  low: 1,
  medium: 2,
  high: 3,
};

const SEARCH_EVIDENCE = new Set([
  'autocomplete',
  'people_also_ask',
  'related_search',
  'provider_keyword_metric',
]);

const STRUCTURAL_ONLY_KINDS = new Set([
  'product_or_instance',
  'low_quality_snippet',
]);

export class EntityEnrichedPhraseAnalysisProvider implements PhraseAnalysisProvider {
  readonly providerKey = 'entity_enriched_phrase_analysis';

  private readonly fallback: PhraseAnalysisProvider;
  private readonly maxSpanTokens: number;
  private readonly maxLookups: number;
  private readonly minAcceptedConfidence: ExternalEntityCandidate['confidence'];

  constructor(
    private readonly entityEnrichment: PhraseEntityEnrichmentService,
    options: EntityEnrichedPhraseAnalysisOptions = {},
  ) {
    this.fallback = options.fallbackProvider ?? new FreePhraseAnalysisProvider();
    this.maxSpanTokens = options.maxSpanTokens ?? 3;
    this.maxLookups = options.maxLookups ?? 12;
    this.minAcceptedConfidence = options.minAcceptedConfidence ?? 'medium';
  }

  async analyze(request: PhraseAnalysisRequest): Promise<PhraseAnalysisResult> {
    const structural = await this.fallback.analyze(request);
    const evidence = await this.collectEntityEvidence(request, structural);
    if (evidence.length === 0) {
      return {
        ...structural,
        providerKey: this.providerKey,
        entityEvidence: [],
        reasons: [
          ...structural.reasons,
          'no external entity evidence found; structural fallback decision retained',
        ],
      };
    }

    const hasSearchEvidence = request.evidenceTypes.some((type) =>
      SEARCH_EVIDENCE.has(type),
    );
    const candidateKind = STRUCTURAL_ONLY_KINDS.has(structural.candidateKind)
      ? structural.candidateKind
      : hasSearchEvidence || structural.candidateKind === 'page_cluster'
        ? 'page_cluster'
        : 'pending';

    return {
      ...structural,
      providerKey: this.providerKey,
      candidateKind,
      confidence: candidateKind === 'page_cluster' && hasSearchEvidence
        ? 'high'
        : structural.confidence === 'low'
          ? 'medium'
          : structural.confidence,
      entityEvidence: evidence,
      reasons: [
        ...structural.reasons,
        `external entity evidence found for ${evidence.length} phrase span(s)`,
      ],
    };
  }

  private async collectEntityEvidence(
    request: PhraseAnalysisRequest,
    structural: PhraseAnalysisResult,
  ): Promise<PhraseEntityEvidence[]> {
    const spans = candidateSpans(request.phrase, request.topicSeed, this.maxSpanTokens)
      .slice(0, this.maxLookups);
    const evidence: PhraseEntityEvidence[] = [];

    for (const span of spans) {
      try {
        const pack = await this.entityEnrichment.enrich({
          entityName: span,
          language: request.language,
          requestedCapabilities: ['entity_lookup', 'entity_types', 'aliases'],
        });
        evidence.push(...pack.candidates
          .filter((candidate) => isAcceptedCandidate(candidate, this.minAcceptedConfidence))
          .map((candidate) => toPhraseEntityEvidence(span, candidate)));
      } catch {
        continue;
      }
    }

    if (evidence.length === 0 && structural.objectSpan?.text) {
      return this.lookupObjectSpan(request, structural.objectSpan.text);
    }

    return dedupeEvidence(evidence);
  }

  private async lookupObjectSpan(
    request: PhraseAnalysisRequest,
    objectSpan: string,
  ): Promise<PhraseEntityEvidence[]> {
    try {
      const pack = await this.entityEnrichment.enrich({
        entityName: objectSpan,
        language: request.language,
        requestedCapabilities: ['entity_lookup', 'entity_types', 'aliases'],
      });
      return dedupeEvidence(pack.candidates
        .filter((candidate) => isAcceptedCandidate(candidate, this.minAcceptedConfidence))
        .map((candidate) => toPhraseEntityEvidence(objectSpan, candidate)));
    } catch {
      return [];
    }
  }
}

function candidateSpans(
  phrase: string,
  topicSeed: string,
  maxSpanTokens: number,
): string[] {
  const phraseTokens = tokens(phrase);
  const topicTokens = new Set(tokens(topicSeed));
  const spans: string[] = [];

  for (let size = Math.min(maxSpanTokens, phraseTokens.length); size >= 1; size -= 1) {
    for (let start = 0; start <= phraseTokens.length - size; start += 1) {
      const spanTokens = phraseTokens.slice(start, start + size);
      if (spanTokens.every(isLookupNoiseToken)) {
        continue;
      }
      if (!spanTokens.some((token) => topicTokens.has(token)) && size === 1) {
        continue;
      }
      spans.push(spanTokens.join(' '));
    }
  }

  return [...new Set(spans)];
}

function tokens(value: string): string[] {
  return normalizeKeyword(value)
    .split(/\s+/u)
    .map((token) => token.trim())
    .filter(Boolean);
}

function isLookupNoiseToken(token: string): boolean {
  return token.length <= 1 ||
    /^\d+(?:[,.]\d+)?$/u.test(token) ||
    /\b[a-z]{1,6}\d[a-z0-9-]*\b/iu.test(token) ||
    /\b\d+[a-z][a-z0-9-]*\b/iu.test(token);
}

function isAcceptedCandidate(
  candidate: ExternalEntityCandidate,
  minAcceptedConfidence: ExternalEntityCandidate['confidence'],
): boolean {
  return CONFIDENCE_RANK[candidate.confidence] >=
    CONFIDENCE_RANK[minAcceptedConfidence] ||
    (candidate.score ?? 0) >= 100;
}

function toPhraseEntityEvidence(
  text: string,
  candidate: ExternalEntityCandidate,
): PhraseEntityEvidence {
  return {
    text,
    providerKey: candidate.providerKey,
    externalId: candidate.externalId,
    externalIdType: candidate.externalIdType,
    name: candidate.name,
    types: candidate.types,
    confidence: candidate.confidence,
    score: candidate.score,
  };
}

function dedupeEvidence(evidence: PhraseEntityEvidence[]): PhraseEntityEvidence[] {
  const byKey = new Map<string, PhraseEntityEvidence>();
  for (const item of evidence) {
    byKey.set([
      item.text,
      item.providerKey,
      item.externalId ?? item.name,
    ].join(':'), item);
  }
  return [...byKey.values()];
}
