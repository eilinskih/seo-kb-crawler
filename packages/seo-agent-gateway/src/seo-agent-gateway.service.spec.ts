import { SeoPack } from '@seo-kb/seo-pack';
import { ResearchDispatchPlan } from '@seo-kb/research-scheduling';
import { SeoAgentGatewayService } from './seo-agent-gateway.service';

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
  competitorInsights: [{ insight: 'Competitors show local proof.', confidence: 'medium', sourceReferences: [] }],
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
    createdAt: '2026-07-23T00:00:00.000Z',
    warnings: [],
    degraded: false,
  },
  freshnessDecisions: [],
  dispatchCommands: [{ target: 'seo_pack', priorityClass: 'highest', topicId: 'topic-1', objective: { type: 'generate_page' }, reason: 'Refresh SEO Pack before generation.', force: false }],
  assetMetrics: [],
  warnings: [],
  degraded: false,
  ruleVersion: 'research-scheduling-v1',
};

describe('SeoAgentGatewayService', () => {
  it('prepares model-agnostic generation context from SEO Pack and focused research', () => {
    const result = new SeoAgentGatewayService().prepare({
      request: {
        topicId: 'topic-1',
        query: ' laser hair removal warsaw ',
        objective: 'page_generation',
        consumerKey: 'codex',
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

    expect(result.request.query).toBe('laser hair removal warsaw');
    expect(result.contextRequirements.requiresFocusedResearch).toBe(true);
    expect(result.generationContext).toMatchObject({
      topicId: 'topic-1',
      focusedResearch: {
        required: true,
        status: 'satisfied',
        researchJobKey: 'research-job-1',
      },
      fallbackState: 'complete',
      retrievalOnlySafeguard: {
        status: 'structured_context_available',
      },
      consumerHints: {
        consumerKey: 'codex',
        adapterAvailable: true,
      },
    });
    expect(result.generationContext.entities).toHaveLength(1);
    expect(result.generationContext.facts).toHaveLength(1);
    expect(result.generationContext.coreIntents).toHaveLength(1);
    expect(result.generationContext.faq).toEqual(['How much does it cost?']);
    expect(result.generationContext.generationConstraints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'cite_required_fact' }),
      ]),
    );
  });

  it('blocks raw retrieval-only generation when structured SEO context is absent', () => {
    const result = new SeoAgentGatewayService().prepare({
      request: {
        topicId: 'topic-1',
        query: 'laser hair removal warsaw',
        objective: 'page_generation',
      },
      contextPackAvailable: true,
    });

    expect(result.generationContext).toMatchObject({
      focusedResearch: {
        required: true,
        status: 'required',
      },
      fallbackState: 'blocked',
      retrievalOnlySafeguard: {
        status: 'blocked_raw_retrieval_only',
      },
      degraded: true,
    });
    expect(result.generationContext.generationConstraints).toEqual([
      expect.objectContaining({
        code: 'avoid_unsupported_claim',
        blocking: true,
      }),
    ]);
  });
});
