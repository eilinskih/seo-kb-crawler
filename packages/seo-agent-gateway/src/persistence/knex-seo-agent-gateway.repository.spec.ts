import {
  __testing,
  KnexSeoAgentGatewayRepository,
} from './knex-seo-agent-gateway.repository';
import { SeoAgentGenerationRuntimeService } from '../seo-agent-generation-runtime.service';

describe('KnexSeoAgentGatewayRepository', () => {
  it('can be constructed with the database boundary', () => {
    const repository = new KnexSeoAgentGatewayRepository({} as never);

    expect(repository).toBeInstanceOf(KnexSeoAgentGatewayRepository);
  });

  it('maps generation contexts into request-keyed rows', async () => {
    const result = await fixtureRuntimeResult();

    expect(
      __testing.toContextRow({
        context: result.gatewayResult.generationContext,
        createdAt: '2026-08-05T00:00:00.000Z',
      }),
    ).toMatchObject({
      gateway_request_key:
        result.gatewayResult.generationContext.gatewayRequestKey,
      topic_id: 'topic-1',
      query: 'laser hair removal warsaw',
      objective: 'page_generation',
      source_pack_references:
        result.gatewayResult.generationContext.requiredPackReferences,
      fallback_state: 'blocked',
      degraded: true,
      context: result.gatewayResult.generationContext,
      created_at: '2026-08-05T00:00:00.000Z',
    });
  });

  it('maps generation responses with prompt, status and provider audit fields', async () => {
    const result = await fixtureRuntimeResult();

    expect(
      __testing.toResponseRow({
        result,
        createdAt: '2026-08-05T00:00:00.000Z',
      }),
    ).toMatchObject({
      gateway_request_key:
        result.gatewayResult.generationContext.gatewayRequestKey,
      topic_id: 'topic-1',
      query: 'laser hair removal warsaw',
      objective: 'page_generation',
      provider_key: null,
      model_family: null,
      status: 'blocked',
      degraded: true,
      prompt: result.prompt,
      provider_result: null,
      final_content: null,
      runtime_result: result,
      created_at: '2026-08-05T00:00:00.000Z',
    });
  });
});

async function fixtureRuntimeResult() {
  return new SeoAgentGenerationRuntimeService().generate({
    request: {
      topicId: 'topic-1',
      query: 'laser hair removal warsaw',
      objective: 'page_generation',
      createdAt: '2026-08-05T00:00:00.000Z',
    },
    contextPackAvailable: true,
  });
}
