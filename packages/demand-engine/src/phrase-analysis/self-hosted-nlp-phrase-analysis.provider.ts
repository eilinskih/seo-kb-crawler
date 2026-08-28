import {
  PhraseAnalysisProvider,
  PhraseAnalysisRequest,
  PhraseAnalysisResult,
  PhraseSpan,
  PhraseToken,
} from './phrase-analysis-types';
import { FreePhraseAnalysisProvider } from './free-phrase-analysis.provider';

export interface SelfHostedNlpPhraseAnalysisProviderOptions {
  endpoint: string;
  providerKey?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}

interface FetchLikeResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

type FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<FetchLikeResponse>;

interface NlpPhraseAnalysisResponse {
  tokens?: Array<{
    text?: string;
    lemma?: string;
    pos?: string;
    dep?: string;
    entityType?: string | null;
  }>;
  entities?: Array<{
    text?: string;
    type?: string;
    confidence?: number;
  }>;
}

const OBJECT_POS = new Set(['NOUN', 'PROPN']);

export class SelfHostedNlpPhraseAnalysisProvider implements PhraseAnalysisProvider {
  readonly providerKey: string;

  private readonly fallback = new FreePhraseAnalysisProvider();
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(private readonly options: SelfHostedNlpPhraseAnalysisProviderOptions) {
    this.providerKey = options.providerKey ?? 'self_hosted_nlp_phrase_analysis';
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async analyze(request: PhraseAnalysisRequest): Promise<PhraseAnalysisResult> {
    const fallback = await this.fallback.analyze(request);

    try {
      const nlp = await this.callNlp(request);
      const objectIndexes = objectTokenIndexes(nlp);
      const modifierIndexes = modifierTokenIndexes(nlp, objectIndexes);
      return {
        ...fallback,
        providerKey: this.providerKey,
        objectSpan: objectIndexes.length > 0
          ? spanFromTokenIndexes(fallback.tokens, objectIndexes)
          : fallback.objectSpan,
        modifierSpans: modifierIndexes.length > 0
          ? [spanFromTokenIndexes(fallback.tokens, modifierIndexes)]
          : fallback.modifierSpans,
        reasons: [
          ...fallback.reasons,
          'self-hosted NLP analysis completed',
        ],
      };
    } catch (error) {
      return {
        ...fallback,
        providerKey: this.providerKey,
        reasons: [
          ...fallback.reasons,
          `self-hosted NLP unavailable: ${errorMessage(error)}`,
        ],
      };
    }
  }

  private async callNlp(
    request: PhraseAnalysisRequest,
  ): Promise<NlpPhraseAnalysisResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(this.options.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: request.phrase,
          language: request.language,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`NLP provider returned HTTP ${response.status}: ${await response.text()}`);
      }

      return response.json() as Promise<NlpPhraseAnalysisResponse>;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function objectTokenIndexes(response: NlpPhraseAnalysisResponse): number[] {
  return (response.tokens ?? [])
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => OBJECT_POS.has((token.pos ?? '').toUpperCase()))
    .map(({ index }) => index);
}

function modifierTokenIndexes(
  response: NlpPhraseAnalysisResponse,
  objectIndexes: number[],
): number[] {
  const objects = new Set(objectIndexes);
  return (response.tokens ?? [])
    .map((token, index) => ({ token, index }))
    .filter(({ token, index }) =>
      !objects.has(index) &&
      ['ADJ', 'ADV', 'NUM'].includes((token.pos ?? '').toUpperCase()))
    .map(({ index }) => index);
}

function spanFromTokenIndexes(
  fallbackTokens: PhraseToken[],
  indexes: number[],
): PhraseSpan {
  const selected = indexes
    .map((index) => fallbackTokens[index])
    .filter((token): token is PhraseToken => Boolean(token));
  return {
    text: selected.map((token) => token.text).join(' '),
    tokenIndexes: selected.map((token) => token.index),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
