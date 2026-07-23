import {
  SaveSeoAgentGenerationContextCommand,
  SeoAgentGatewayRepository,
  SeoAgentGenerationContextRecord,
} from '../persistence/seo-agent-gateway.repository';

export class InMemorySeoAgentGatewayRepository
  implements SeoAgentGatewayRepository
{
  private readonly contexts: SeoAgentGenerationContextRecord[] = [];

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
}
