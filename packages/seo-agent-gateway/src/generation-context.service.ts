import {
  DEFAULT_SEO_AGENT_GATEWAY_RULE_VERSION,
} from './seo-agent-gateway-defaults';
import {
  FocusedResearchRequirement,
  GatewayContextInput,
  SeoAgentGenerationContext,
} from './domain/seo-agent-gateway-types';
import { RetrievalOnlySafeguardResult } from './retrieval-only-safeguard.service';

export class GenerationContextService {
  build(
    input: GatewayContextInput,
    focusedResearch: FocusedResearchRequirement,
    safeguard: RetrievalOnlySafeguardResult,
    adapterAvailable: boolean,
  ): SeoAgentGenerationContext {
    const seoPack = input.seoPack;
    const missingPackWarnings = [
      ...(input.missingPackWarnings ?? []),
      ...(seoPack ? seoPack.uncertainty.missingPackWarnings : ['SEO Pack is unavailable']),
    ];
    const warnings = [
      ...focusedResearch.warnings,
      ...safeguard.warnings,
      ...missingPackWarnings,
      ...(input.contextPackWarnings ?? []),
      ...(seoPack?.warnings ?? []),
    ];
    const fallbackState = input.blocked
      ? 'blocked'
      : safeguard.status === 'blocked_raw_retrieval_only'
        ? 'blocked'
        : warnings.length > 0 || seoPack?.degraded
          ? 'degraded'
          : 'complete';

    return {
      gatewayRequestKey: this.requestKey(input),
      topicId: input.request.topicId,
      query: input.request.query,
      language: input.request.language,
      geo: input.request.geo,
      objective: input.request.objective,
      pageType: input.request.pageType ?? seoPack?.pageType,
      focusedResearch,
      requiredPackReferences: [
        ...(input.request.sourcePackReferences ?? []),
        ...(seoPack?.sourcePackReferences ?? []),
      ],
      researchAssets: {
        focusedResearchJobKey: focusedResearch.researchJobKey,
        dispatchTargets:
          input.researchDispatchPlan?.dispatchCommands.map(
            (command) => command.target,
          ) ?? [],
        freshnessWarnings:
          input.researchDispatchPlan?.freshnessDecisions.flatMap(
            (decision) => decision.warnings,
          ) ?? [],
        assetMetricTypes:
          input.researchDispatchPlan?.assetMetrics.map(
            (metric) => metric.metricType,
          ) ?? [],
      },
      entities: seoPack?.requiredEntities ?? [],
      facts: seoPack?.requiredFacts ?? [],
      coreIntents: seoPack?.mandatorySerpIntents ?? [],
      opportunityIntents: seoPack?.opportunityIntents ?? [],
      serpPatterns: seoPack?.competitorInsights.map((insight) => insight.insight) ?? [],
      serpExpectations: seoPack?.serpExpectations ?? [],
      faq: seoPack?.faqRecommendations.map((faq) => faq.question) ?? [],
      sources: seoPack?.sourceReferences ?? [],
      generationConstraints: seoPack?.generationConstraints ?? [
        {
          code: 'avoid_unsupported_claim',
          detail:
            'Do not generate SEO copy until structured SEO context is available.',
          sourceIds: [],
          blocking: true,
        },
      ],
      uncertainty: {
        evidenceGaps: seoPack?.uncertainty.evidenceGaps ?? [],
        unresolvedConflicts: seoPack?.uncertainty.unresolvedConflicts ?? [],
        weakEvidenceWarnings: seoPack?.uncertainty.weakEvidenceWarnings ?? [],
        missingPackWarnings,
      },
      retrievalOnlySafeguard: safeguard,
      fallbackState,
      consumerHints: {
        consumerKey: input.request.consumerKey ?? null,
        targetModelFamily: input.request.targetModelFamily ?? null,
        adapterAvailable,
        warnings: adapterAvailable
          ? []
          : ['No matching consumer adapter is registered for this request.'],
      },
      warnings: [...new Set(warnings)],
      degraded: fallbackState !== 'complete',
      ruleVersion: DEFAULT_SEO_AGENT_GATEWAY_RULE_VERSION,
    };
  }

  private requestKey(input: GatewayContextInput): string {
    return `${input.request.topicId}:${input.request.objective}:${input.request.candidateKey ?? input.request.query}`;
  }
}
