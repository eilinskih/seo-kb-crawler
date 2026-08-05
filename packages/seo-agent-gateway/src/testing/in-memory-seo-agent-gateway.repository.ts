import {
  SaveSeoAgentGenerationContextCommand,
  SaveSeoAgentGenerationResponseCommand,
  SeoAgentGatewayRepository,
  SeoAgentGenerationContextRecord,
  SeoAgentGenerationResponseRecord,
} from '../persistence/seo-agent-gateway.repository';

export class InMemorySeoAgentGatewayRepository
  implements SeoAgentGatewayRepository
{
  private readonly contexts: SeoAgentGenerationContextRecord[] = [];
  private readonly responses: SeoAgentGenerationResponseRecord[] = [];

  async saveGenerationContext(
    command: SaveSeoAgentGenerationContextCommand,
  ): Promise<SeoAgentGenerationContextRecord> {
    const record = {
      ...command.context,
      id: `seo-agent-generation-context-${this.contexts.length + 1}`,
      createdAt: command.createdAt,
    };
    this.contexts.push(record);
    return record;
  }

  async findLatestGenerationContext(
    topicId: string,
    query: string,
  ): Promise<SeoAgentGenerationContextRecord | null> {
    return (
      [...this.contexts]
        .reverse()
        .find((context) => context.topicId === topicId && context.query === query) ??
      null
    );
  }

  async saveGenerationResponse(
    command: SaveSeoAgentGenerationResponseCommand,
  ): Promise<SeoAgentGenerationResponseRecord> {
    const context = command.result.gatewayResult.generationContext;
    const record = {
      id: `seo-agent-generation-response-${this.responses.length + 1}`,
      gatewayRequestKey: context.gatewayRequestKey,
      topicId: context.topicId,
      query: context.query,
      objective: context.objective,
      providerKey: command.result.providerResult?.providerKey ?? null,
      modelFamily: command.result.providerResult?.modelFamily ?? null,
      status: command.result.status,
      degraded: command.result.degraded,
      finalContent: command.result.finalContent,
      prompt: command.result.prompt,
      providerResult: command.result.providerResult,
      warnings: command.result.warnings,
      runtimeResult: command.result,
      createdAt: command.createdAt,
    };
    this.responses.push(record);
    return record;
  }

  async findLatestGenerationResponse(
    topicId: string,
    query: string,
  ): Promise<SeoAgentGenerationResponseRecord | null> {
    return (
      [...this.responses]
        .reverse()
        .find((response) => response.topicId === topicId && response.query === query) ??
      null
    );
  }
}
