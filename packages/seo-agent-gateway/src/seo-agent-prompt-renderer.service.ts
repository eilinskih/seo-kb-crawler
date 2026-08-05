import {
  SeoAgentGenerationContext,
  SeoAgentPrompt,
} from './domain/seo-agent-gateway-types';

export class SeoAgentPromptRendererService {
  render(context: SeoAgentGenerationContext): SeoAgentPrompt {
    const blocked =
      context.fallbackState === 'blocked' ||
      context.retrievalOnlySafeguard.status === 'blocked_raw_retrieval_only';
    const warnings = unique([
      ...context.warnings,
      ...context.consumerHints.warnings,
      ...context.uncertainty.missingPackWarnings,
      ...context.uncertainty.weakEvidenceWarnings,
      ...context.retrievalOnlySafeguard.warnings,
    ]);

    return {
      promptKey: `${context.gatewayRequestKey}:prompt:${context.ruleVersion}`,
      gatewayRequestKey: context.gatewayRequestKey,
      messages: [
        {
          role: 'system',
          content: [
            'You are an SEO generation agent.',
            'Use only structured gateway context as the authoritative source.',
            'Do not generate SEO content from raw retrieval chunks alone.',
            'Preserve uncertainty and evidence gaps instead of inventing claims.',
            'Follow mandatory SERP intent and generation constraints.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: this.renderUserMessage(context, blocked, warnings),
        },
      ],
      requiredPackReferences: context.requiredPackReferences,
      blocked,
      warnings,
      ruleVersion: context.ruleVersion,
    };
  }

  private renderUserMessage(
    context: SeoAgentGenerationContext,
    blocked: boolean,
    warnings: string[],
  ): string {
    return [
      section('Generation Request', [
        `Topic ID: ${context.topicId}`,
        `Query: ${context.query}`,
        `Objective: ${context.objective}`,
        `Page type: ${context.pageType ?? 'unspecified'}`,
        `Language: ${context.language ?? 'unspecified'}`,
        `Geo: ${formatJson(context.geo)}`,
        `Fallback state: ${context.fallbackState}`,
        `Blocked: ${blocked ? 'yes' : 'no'}`,
      ]),
      section('Research State', [
        `Focused research status: ${context.focusedResearch.status}`,
        `Focused research job: ${context.focusedResearch.researchJobKey ?? 'none'}`,
        `Dispatch targets: ${list(context.researchAssets.dispatchTargets)}`,
        `Freshness warnings: ${list(context.researchAssets.freshnessWarnings)}`,
      ]),
      section(
        'Required Entities',
        context.entities.map((entity) =>
          `${entity.label} (${entity.type}, confidence: ${entity.confidence})`,
        ),
      ),
      section(
        'Required Facts',
        context.facts.map((fact) =>
          [
            `${fact.factId}: ${fact.statement}`,
            `confidence: ${fact.confidence}`,
            `source references: ${fact.sourceReferences
              .map((source) => source.sourceId)
              .join(', ') || 'none'}`,
          ].join(' | '),
        ),
      ),
      section(
        'Mandatory SERP Intent',
        context.coreIntents.map((intent) =>
          `${intent.requirementKey}: ${intent.label} (${intent.priority}, confidence: ${intent.confidence})`,
        ),
      ),
      section(
        'Opportunity Intent',
        context.opportunityIntents.map((intent) =>
          `${intent.requirementKey}: ${intent.label} (${intent.priority}, confidence: ${intent.confidence})`,
        ),
      ),
      section('SERP Patterns', context.serpPatterns),
      section(
        'SERP Expectations',
        context.serpExpectations.map((expectation) =>
          `${expectation.requirementKey}: ${expectation.label} (${expectation.priority})`,
        ),
      ),
      section('FAQ Requirements', context.faq),
      section(
        'Generation Constraints',
        context.generationConstraints.map((constraint) =>
          `${constraint.blocking ? 'BLOCKING' : 'NON-BLOCKING'} ${constraint.code}: ${constraint.detail}`,
        ),
      ),
      section('Source References', context.sources.map((source) => source.sourceId)),
      section('Evidence Gaps', context.uncertainty.evidenceGaps),
      section('Unresolved Conflicts', context.uncertainty.unresolvedConflicts),
      section('Warnings', warnings),
    ].join('\n\n');
  }
}

function section(title: string, lines: string[]): string {
  const body = lines.length > 0 ? lines.map((line) => `- ${line}`).join('\n') : '- none';
  return `## ${title}\n${body}`;
}

function list(values: string[]): string {
  return values.length > 0 ? values.join(', ') : 'none';
}

function formatJson(value: unknown): string {
  return value === undefined ? 'unspecified' : JSON.stringify(value);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}
