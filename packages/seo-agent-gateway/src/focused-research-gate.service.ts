import { ResearchDispatchPlan } from '@seo-kb/research-scheduling';
import {
  FocusedResearchRequirement,
  SeoAgentGatewayRequest,
} from './domain/seo-agent-gateway-types';

export class FocusedResearchGateService {
  requirement(
    request: SeoAgentGatewayRequest,
    researchDispatchPlan?: ResearchDispatchPlan,
  ): FocusedResearchRequirement {
    if (researchDispatchPlan) {
      return {
        required: true,
        requested: true,
        researchJobKey: researchDispatchPlan.job.jobKey,
        status: researchDispatchPlan.degraded ? 'degraded' : 'satisfied',
        warnings: researchDispatchPlan.warnings,
      };
    }

    return {
      required: true,
      requested: Boolean(request.forceResearch),
      researchJobKey: null,
      status: request.forceResearch ? 'requested' : 'required',
      warnings: ['Focused Research must be requested before SEO generation.'],
    };
  }
}
