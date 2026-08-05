import {
  SeoAgentGenerationContext,
  SeoAgentGenerationRuntimeResult,
} from '../domain/seo-agent-gateway-types';

export interface SaveSeoAgentGenerationContextCommand {
  context: SeoAgentGenerationContext;
  createdAt: string;
}

export interface SeoAgentGenerationContextRecord
  extends SeoAgentGenerationContext {
  id: string;
  createdAt: string;
}

export interface SaveSeoAgentGenerationResponseCommand {
  result: SeoAgentGenerationRuntimeResult;
  createdAt: string;
}

export interface SeoAgentGenerationResponseRecord {
  id: string;
  gatewayRequestKey: string;
  topicId: string;
  query: string;
  objective: string;
  providerKey: string | null;
  modelFamily: string | null;
  status: SeoAgentGenerationRuntimeResult['status'];
  degraded: boolean;
  finalContent: string | null;
  prompt: SeoAgentGenerationRuntimeResult['prompt'];
  providerResult: SeoAgentGenerationRuntimeResult['providerResult'];
  warnings: string[];
  runtimeResult: SeoAgentGenerationRuntimeResult;
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
  saveGenerationResponse(
    command: SaveSeoAgentGenerationResponseCommand,
  ): Promise<SeoAgentGenerationResponseRecord>;
  findLatestGenerationResponse(
    topicId: string,
    query: string,
  ): Promise<SeoAgentGenerationResponseRecord | null>;
}
