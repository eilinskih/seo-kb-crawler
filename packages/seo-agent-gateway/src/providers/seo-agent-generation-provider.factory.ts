import { ConfigService } from '@nestjs/config';
import { SeoAgentGenerationProvider } from '../domain/seo-agent-gateway-types';
import { OpenAiResponsesGenerationProvider } from './openai-responses-generation.provider';

export function configuredSeoAgentGenerationProviders(
  config: Pick<ConfigService, 'get'>,
): SeoAgentGenerationProvider[] {
  const apiKey =
    config.get<string>('SEO_AGENT_OPENAI_API_KEY') ??
    config.get<string>('OPENAI_API_KEY');

  if (!apiKey) {
    return [];
  }

  return [
    new OpenAiResponsesGenerationProvider({
      apiKey,
      model:
        config.get<string>('SEO_AGENT_OPENAI_MODEL') ??
        config.get<string>('OPENAI_MODEL') ??
        'gpt-5',
      endpoint: config.get<string>('SEO_AGENT_OPENAI_ENDPOINT'),
      timeoutMs: numberConfig(config.get<string>('SEO_AGENT_OPENAI_TIMEOUT_MS')),
    }),
  ];
}

function numberConfig(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
