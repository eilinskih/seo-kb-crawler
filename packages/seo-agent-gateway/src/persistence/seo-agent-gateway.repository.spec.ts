import { InMemorySeoAgentGatewayRepository } from '../testing/in-memory-seo-agent-gateway.repository';
import { SeoAgentGenerationContext } from '../domain/seo-agent-gateway-types';
import { SeoAgentGenerationRuntimeService } from '../seo-agent-generation-runtime.service';

describe('SeoAgentGatewayRepository', () => {
  it('preserves the latest generation context by topic and query', async () => {
    const repository = new InMemorySeoAgentGatewayRepository();
    const context: SeoAgentGenerationContext = {
      gatewayRequestKey: 'topic-1:page_generation:query',
      topicId: 'topic-1',
      query: 'query',
      objective: 'page_generation',
      focusedResearch: {
        required: true,
        requested: true,
        researchJobKey: 'research-1',
        status: 'satisfied',
        warnings: [],
      },
      requiredPackReferences: [],
      researchAssets: {
        focusedResearchJobKey: 'research-1',
        dispatchTargets: [],
        freshnessWarnings: [],
        assetMetricTypes: [],
      },
      entities: [],
      facts: [],
      coreIntents: [],
      opportunityIntents: [],
      serpPatterns: [],
      serpExpectations: [],
      faq: [],
      sources: [],
      generationConstraints: [],
      uncertainty: {
        evidenceGaps: [],
        unresolvedConflicts: [],
        weakEvidenceWarnings: [],
        missingPackWarnings: [],
      },
      retrievalOnlySafeguard: {
        status: 'structured_context_available',
        warnings: [],
      },
      fallbackState: 'complete',
      consumerHints: {
        consumerKey: null,
        targetModelFamily: null,
        adapterAvailable: false,
        warnings: [],
      },
      warnings: [],
      degraded: false,
      ruleVersion: 'seo-agent-gateway-v1',
    };

    await repository.saveGenerationContext({
      context,
      createdAt: '2026-07-23T00:00:00.000Z',
    });
    await repository.saveGenerationContext({
      context: { ...context, warnings: ['newer'] },
      createdAt: '2026-07-23T01:00:00.000Z',
    });

    await expect(
      repository.findLatestGenerationContext('topic-1', 'query'),
    ).resolves.toMatchObject({
      id: 'seo-agent-generation-context-2',
      warnings: ['newer'],
    });
  });

  it('preserves the latest generation response by topic and query', async () => {
    const repository = new InMemorySeoAgentGatewayRepository();
    const result = await new SeoAgentGenerationRuntimeService(
      undefined,
      undefined,
      [],
      repository,
    ).generate({
      request: {
        topicId: 'topic-1',
        query: 'query',
        objective: 'page_generation',
        createdAt: '2026-08-05T00:00:00.000Z',
      },
      contextPackAvailable: true,
    });

    expect(result.persistedResponseId).toBe('seo-agent-generation-response-1');
    await expect(
      repository.findLatestGenerationResponse('topic-1', 'query'),
    ).resolves.toMatchObject({
      id: 'seo-agent-generation-response-1',
      status: 'blocked',
      finalContent: null,
      runtimeResult: expect.objectContaining({
        status: 'blocked',
      }),
    });
  });
});
