import {
  SeoAgentGatewayRequest,
  SeoGenerationObjective,
} from './domain/seo-agent-gateway-types';

const DEFAULT_OBJECTIVE: SeoGenerationObjective = 'page_generation';

export class SeoGenerationRequestService {
  normalize(request: SeoAgentGatewayRequest): SeoAgentGatewayRequest {
    return {
      ...request,
      query: request.query.trim().replace(/\s+/g, ' '),
      objective: request.objective ?? DEFAULT_OBJECTIVE,
      candidateKey: request.candidateKey ?? this.candidateKey(request.query),
      consumerKey: request.consumerKey,
      createdAt: request.createdAt ?? new Date().toISOString(),
    };
  }

  private candidateKey(query: string): string {
    return `candidate:${query.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  }
}
