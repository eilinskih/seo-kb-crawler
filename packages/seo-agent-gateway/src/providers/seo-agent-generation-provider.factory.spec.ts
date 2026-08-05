import { OpenAiResponsesGenerationProvider } from './openai-responses-generation.provider';
import { configuredSeoAgentGenerationProviders } from './seo-agent-generation-provider.factory';

describe('configuredSeoAgentGenerationProviders', () => {
  it('returns no providers when generation credentials are absent', () => {
    expect(
      configuredSeoAgentGenerationProviders({
        get: () => undefined,
      }),
    ).toEqual([]);
  });

  it('registers the OpenAI Responses provider when an API key is configured', () => {
    const providers = configuredSeoAgentGenerationProviders({
      get: (key: string) =>
        ({
          SEO_AGENT_OPENAI_API_KEY: 'test-key',
          SEO_AGENT_OPENAI_MODEL: 'gpt-5',
        })[key],
    });

    expect(providers).toHaveLength(1);
    expect(providers[0]).toBeInstanceOf(OpenAiResponsesGenerationProvider);
    expect(providers[0].providerKey).toBe('openai_responses');
  });
});
