import {
  GatewayContextRequirements,
  SeoAgentGatewayRequest,
} from './domain/seo-agent-gateway-types';

export class ContextRequirementService {
  resolve(_request: SeoAgentGatewayRequest): GatewayContextRequirements {
    return {
      requiresFocusedResearch: true,
      requiredPackTypes: [
        'knowledge_pack',
        'serp_pack',
        'serp_intent_pack',
        'research_assets',
      ],
      optionalPackTypes: ['demand_pack', 'candidate_scoring_pack'],
      minimumStructuredContext: 'seo_pack_or_structured_fallback',
    };
  }
}
