import { SeoAgentGenerationContext } from '../domain/seo-agent-gateway-types';

export interface SaveSeoAgentGenerationContextCommand {
  context: SeoAgentGenerationContext;
  createdAt: string;
}

export interface SeoAgentGenerationContextRecord
  extends SeoAgentGenerationContext {
  id: string;
  createdAt: string;
}

export interface SeoAgentGatewayRepository {
  saveGenerationContext(
    command: SaveSeoAgentGenerationContextCommand,
  ): Promise<SeoAgentGenerationContextRecord>;
  findLatestGenerationContext(
    topicId: string,
    query: string,
  ): Promise<SeoAgentGenerationContextRecord | null>;
}
