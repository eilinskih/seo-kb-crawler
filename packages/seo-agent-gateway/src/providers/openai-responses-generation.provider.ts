import {
  SeoAgentGenerationProvider,
  SeoAgentProviderFinishReason,
  SeoAgentProviderRequest,
  SeoAgentProviderResult,
  SeoAgentProviderUsage,
} from '../domain/seo-agent-gateway-types';

export interface OpenAiResponsesGenerationProviderOptions {
  apiKey: string;
  model: string;
  endpoint?: string;
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
  init: {
    method: 'POST';
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  },
) => Promise<FetchLikeResponse>;

interface OpenAiResponsesApiResult {
  id?: string;
  model?: string;
  status?: string;
  output_text?: string;
  error?: {
    code?: string;
    message?: string;
  } | null;
  incomplete_details?: {
    reason?: string;
  } | null;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
}

export class OpenAiResponsesGenerationProvider
  implements SeoAgentGenerationProvider
{
  readonly providerKey: string;
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(private readonly options: OpenAiResponsesGenerationProviderOptions) {
    this.providerKey = options.providerKey ?? 'openai_responses';
    this.endpoint = options.endpoint ?? 'https://api.openai.com/v1/responses';
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generate(
    request: SeoAgentProviderRequest,
  ): Promise<SeoAgentProviderResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.options.model,
          input: request.prompt.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `OpenAI Responses API returned HTTP ${response.status}: ${await response.text()}`,
        );
      }

      const payload = await response.json();
      return toProviderResult(
        payload as OpenAiResponsesApiResult,
        this.providerKey,
        request.modelFamily,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

function toProviderResult(
  payload: OpenAiResponsesApiResult,
  providerKey: string,
  modelFamily: string | undefined,
): SeoAgentProviderResult {
  const content = extractOutputText(payload);
  const finishReason = finishReasonFor(payload);
  const warnings = warningsFor(payload, content);

  return {
    providerKey,
    modelFamily: modelFamily ?? payload.model,
    content,
    finishReason,
    usage: usageFor(payload),
    auditMetadata: {
      responseId: payload.id ?? null,
      model: payload.model ?? null,
      status: payload.status ?? null,
      errorCode: payload.error?.code ?? null,
      incompleteReason: payload.incomplete_details?.reason ?? null,
    },
    warnings,
    degraded: finishReason !== 'stop' || warnings.length > 0 || content === null,
    generatedAt: new Date().toISOString(),
  };
}

function extractOutputText(payload: OpenAiResponsesApiResult): string | null {
  if (payload.output_text && payload.output_text.trim().length > 0) {
    return payload.output_text;
  }

  const text = payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((value): value is string => Boolean(value && value.length > 0))
    .join('\n')
    .trim();

  return text && text.length > 0 ? text : null;
}

function finishReasonFor(
  payload: OpenAiResponsesApiResult,
): SeoAgentProviderFinishReason {
  if (payload.error) {
    return 'error';
  }

  if (payload.incomplete_details?.reason === 'max_output_tokens') {
    return 'length';
  }

  if (payload.status === 'completed') {
    return 'stop';
  }

  if (payload.status === 'incomplete') {
    return 'length';
  }

  return 'unknown';
}

function usageFor(
  payload: OpenAiResponsesApiResult,
): SeoAgentProviderUsage | undefined {
  if (!payload.usage) {
    return undefined;
  }

  return {
    inputTokens: payload.usage.input_tokens,
    outputTokens: payload.usage.output_tokens,
    totalTokens: payload.usage.total_tokens,
  };
}

function warningsFor(
  payload: OpenAiResponsesApiResult,
  content: string | null,
): string[] {
  const warnings: string[] = [];

  if (payload.error?.message) {
    warnings.push(`OpenAI response error: ${payload.error.message}`);
  }

  if (payload.incomplete_details?.reason) {
    warnings.push(
      `OpenAI response incomplete: ${payload.incomplete_details.reason}`,
    );
  }

  if (content === null) {
    warnings.push('OpenAI response did not include output text.');
  }

  return warnings;
}

export const __openAiResponsesTesting = {
  toProviderResult,
};
