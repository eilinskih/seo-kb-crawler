import { SeoPack } from '@seo-kb/seo-pack';
import { ResearchDispatchPlan } from '@seo-kb/research-scheduling';
import {
  SeoAgentGenerationProvider,
  SeoAgentProviderRequest,
  SeoAgentProviderResult,
} from './domain/seo-agent-gateway-types';
import { SeoAgentGenerationRuntimeService } from './seo-agent-generation-runtime.service';

const seoPack: SeoPack = {
  packKey: 'topic-1:candidate-1:guide',
  topicId: 'topic-1',
  candidateKey: 'candidate-1',
  pageType: 'guide',
  pageBrief: {
    titleConcept: 'Laser hair removal Warsaw',
    targetAudience: null,
    primaryIntent: 'Understand local pricing',
    secondaryIntents: [],
    candidateRationale: ['Strong candidate.'],
    demandSummary: 'Demand exists.',
    serpSummary: 'SERP expects price and safety coverage.',
    knowledgeSummary: 'Knowledge summary.',
    evidenceGaps: [],
    nonGoals: [],
  },
  recommendedOutline: [],
  faqRecommendations: [
    {
      question: 'How much does it cost?',
      intentId: 'intent:price',
      priority: 'mandatory',
      requiredFactIds: ['fact-1'],
      sourceReferences: [],
      confidence: 'medium',
      unresolvedEvidenceGaps: [],
    },
  ],
  requiredEntities: [
    {
      entityId: 'entity-1',
      label: 'Laser hair removal',
      type: 'procedure',
      aliases: [],
      confidence: 'high',
      sourceReferences: [],
    },
  ],
  requiredFacts: [
    {
      factId: 'fact-1',
      statement: 'Aftercare matters.',
      entityIds: ['entity-1'],
      confidence: 'high',
      sourceReferences: [{ sourceId: 'source-1', sourceType: 'page' }],
      unresolvedConflict: false,
      requiresMoreResearch: false,
    },
  ],
  mandatorySerpIntents: [
    {
      requirementKey: 'intent:price',
      label: 'Understand local pricing',
      priority: 'mandatory',
      confidence: 'high',
      sourceReferences: [],
      warnings: [],
    },
  ],
  opportunityIntents: [],
  serpExpectations: [],
  competitorInsights: [
    {
      insight: 'Competitors show local proof.',
      confidence: 'medium',
      sourceReferences: [],
    },
  ],
  internalLinkingHints: [],
  generationConstraints: [
    {
      code: 'cite_required_fact',
      detail: 'Cite required fact.',
      sourceIds: ['source-1'],
      blocking: false,
    },
  ],
  sourceReferences: [{ sourceId: 'source-1', sourceType: 'page' }],
  uncertainty: {
    evidenceGaps: [],
    unresolvedConflicts: [],
    weakEvidenceWarnings: [],
    missingPackWarnings: [],
  },
  warnings: [],
  degraded: false,
  sourcePackReferences: [{ packType: 'knowledge_pack', packId: 'knowledge-1' }],
  ruleVersion: 'seo-pack-v1',
};

const researchDispatchPlan: ResearchDispatchPlan = {
  job: {
    jobKey: 'research-job-1',
    topicId: 'topic-1',
    mode: 'focused',
    priorityClass: 'highest',
    trigger: 'generation_request',
    objective: { type: 'generate_page', query: 'laser hair removal warsaw' },
    requestedBy: null,
    createdAt: '2026-08-05T00:00:00.000Z',
    warnings: [],
    degraded: false,
  },
  freshnessDecisions: [],
  dispatchCommands: [],
  assetMetrics: [],
  warnings: [],
  degraded: false,
  ruleVersion: 'research-scheduling-v1',
};

describe('SeoAgentGenerationRuntimeService', () => {
  it('renders structured SEO context and calls a model-agnostic provider', async () => {
    const provider = new StaticSeoAgentProvider('Generated article.');
    const result = await new SeoAgentGenerationRuntimeService(
      undefined,
      undefined,
      [provider],
    ).generate({
      request: {
        topicId: 'topic-1',
        query: 'laser hair removal warsaw',
        objective: 'page_generation',
        consumerKey: 'codex',
        targetModelFamily: 'general_llm',
        createdAt: '2026-08-05T00:00:00.000Z',
      },
      seoPack,
      researchDispatchPlan,
      consumerAdapters: [
        {
          consumerKey: 'codex',
          supportedObjectives: ['page_generation'],
          supportedContextVersion: 'seo-agent-gateway-v1',
        },
      ],
    });

    expect(result.status).toBe('generated');
    expect(result.finalContent).toBe('Generated article.');
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0].prompt.messages[1].content).toContain(
      'Aftercare matters.',
    );
    expect(provider.calls[0].prompt.messages[1].content).toContain(
      'Understand local pricing',
    );
    expect(provider.calls[0].prompt.messages[1].content).toContain(
      'Competitors show local proof.',
    );
  });

  it('continues in degraded mode when no generation provider is configured', async () => {
    const result = await new SeoAgentGenerationRuntimeService().generate({
      request: {
        topicId: 'topic-1',
        query: 'laser hair removal warsaw',
        objective: 'page_generation',
      },
      seoPack,
    });

    expect(result).toMatchObject({
      status: 'degraded',
      providerResult: null,
      finalContent: null,
      degraded: true,
    });
    expect(result.warnings).toContain(
      'Generation provider unavailable: no provider configured',
    );
  });

  it('degrades honestly when a provider fails', async () => {
    const provider = new FailingSeoAgentProvider();
    const result = await new SeoAgentGenerationRuntimeService(
      undefined,
      undefined,
      [provider],
    ).generate({
      request: {
        topicId: 'topic-1',
        query: 'laser hair removal warsaw',
        objective: 'page_generation',
      },
      providerKey: 'failing_provider',
      seoPack,
    });

    expect(result.status).toBe('degraded');
    expect(result.finalContent).toBeNull();
    expect(result.warnings).toContain('Generation provider failed: timeout');
  });

  it('blocks retrieval-only generation before calling a provider', async () => {
    const provider = new StaticSeoAgentProvider('Should not be generated.');
    const result = await new SeoAgentGenerationRuntimeService(
      undefined,
      undefined,
      [provider],
    ).generate({
      request: {
        topicId: 'topic-1',
        query: 'laser hair removal warsaw',
        objective: 'page_generation',
      },
      contextPackAvailable: true,
    });

    expect(result.status).toBe('blocked');
    expect(result.finalContent).toBeNull();
    expect(result.prompt.blocked).toBe(true);
    expect(provider.calls).toHaveLength(0);
    expect(result.warnings).toContain(
      'Generation blocked because structured SEO context is unavailable.',
    );
  });
});

class StaticSeoAgentProvider implements SeoAgentGenerationProvider {
  readonly providerKey = 'static_provider';
  readonly calls: SeoAgentProviderRequest[] = [];

  constructor(private readonly content: string) {}

  async generate(
    request: SeoAgentProviderRequest,
  ): Promise<SeoAgentProviderResult> {
    this.calls.push(request);
    return {
      providerKey: this.providerKey,
      modelFamily: request.modelFamily,
      content: this.content,
      finishReason: 'stop',
      auditMetadata: {
        testProvider: true,
      },
      warnings: [],
      degraded: false,
      generatedAt: '2026-08-05T00:00:00.000Z',
    };
  }
}

class FailingSeoAgentProvider implements SeoAgentGenerationProvider {
  readonly providerKey = 'failing_provider';

  async generate(): Promise<SeoAgentProviderResult> {
    throw new Error('timeout');
  }
}
