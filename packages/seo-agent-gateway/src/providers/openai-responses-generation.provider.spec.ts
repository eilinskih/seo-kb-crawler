import {
  __openAiResponsesTesting,
  OpenAiResponsesGenerationProvider,
} from './openai-responses-generation.provider';
import { SeoAgentGatewayService } from '../seo-agent-gateway.service';
import { SeoAgentPromptRendererService } from '../seo-agent-prompt-renderer.service';

describe('OpenAiResponsesGenerationProvider', () => {
  it('calls the Responses API with model-agnostic prompt messages', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'resp-1',
        model: 'gpt-5',
        status: 'completed',
        output_text: 'Generated SEO page.',
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          total_tokens: 30,
        },
      }),
      text: async () => '',
    }));
    const provider = new OpenAiResponsesGenerationProvider({
      apiKey: 'test-key',
      model: 'gpt-5',
      endpoint: 'https://example.test/v1/responses',
      fetchImpl,
    });

    const result = await provider.generate(fixtureProviderRequest());

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://example.test/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        }),
      }),
    );
    const calls = fetchImpl.mock.calls as unknown as Array<
      [string, { body: string }]
    >;
    const [, init] = calls[0];
    expect(JSON.parse(init.body)).toMatchObject({
      model: 'gpt-5',
      input: [
        {
          role: 'system',
          content: expect.stringContaining('structured gateway context'),
        },
        {
          role: 'user',
          content: expect.stringContaining('laser hair removal warsaw'),
        },
      ],
    });
    expect(result).toMatchObject({
      providerKey: 'openai_responses',
      content: 'Generated SEO page.',
      finishReason: 'stop',
      usage: {
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      },
      degraded: false,
    });
  });

  it('maps incomplete OpenAI responses into degraded provider results', () => {
    expect(
      __openAiResponsesTesting.toProviderResult(
        {
          id: 'resp-2',
          model: 'gpt-5',
          status: 'incomplete',
          incomplete_details: {
            reason: 'max_output_tokens',
          },
          output_text: 'Partial output',
        },
        'openai_responses',
        undefined,
      ),
    ).toMatchObject({
      content: 'Partial output',
      finishReason: 'length',
      degraded: true,
      warnings: ['OpenAI response incomplete: max_output_tokens'],
    });
  });

  it('throws on non-2xx API responses so runtime can degrade the attempt', async () => {
    const provider = new OpenAiResponsesGenerationProvider({
      apiKey: 'test-key',
      model: 'gpt-5',
      fetchImpl: async () => ({
        ok: false,
        status: 429,
        json: async () => ({}),
        text: async () => 'rate limited',
      }),
    });

    await expect(provider.generate(fixtureProviderRequest())).rejects.toThrow(
      'OpenAI Responses API returned HTTP 429: rate limited',
    );
  });
});

function fixtureProviderRequest() {
  const gatewayResult = new SeoAgentGatewayService().prepare({
    request: {
      topicId: 'topic-1',
      query: 'laser hair removal warsaw',
      objective: 'page_generation',
    },
    contextPackAvailable: true,
  });
  const prompt = new SeoAgentPromptRendererService().render(
    gatewayResult.generationContext,
  );

  return {
    providerKey: 'openai_responses',
    request: gatewayResult.request,
    context: gatewayResult.generationContext,
    prompt,
  };
}
