import {
  GatewayContextInput,
  SeoAgentGatewayResult,
} from './domain/seo-agent-gateway-types';
import { ConsumerAdapterRegistry } from './consumer-adapter-registry';
import { ContextRequirementService } from './context-requirement.service';
import { FocusedResearchGateService } from './focused-research-gate.service';
import { GenerationContextService } from './generation-context.service';
import { RetrievalOnlySafeguardService } from './retrieval-only-safeguard.service';
import { SeoGenerationRequestService } from './seo-generation-request.service';

export class SeoAgentGatewayService {
  constructor(
    private readonly requestService = new SeoGenerationRequestService(),
    private readonly requirementService = new ContextRequirementService(),
    private readonly focusedResearchGate = new FocusedResearchGateService(),
    private readonly safeguardService = new RetrievalOnlySafeguardService(),
    private readonly generationContextService = new GenerationContextService(),
  ) {}

  prepare(input: GatewayContextInput): SeoAgentGatewayResult {
    const request = this.requestService.normalize(input.request);
    const contextRequirements = this.requirementService.resolve(request);
    const focusedResearch = this.focusedResearchGate.requirement(
      request,
      input.researchDispatchPlan,
    );
    const structuredFallbackAvailable = Boolean(
      input.seoPack ||
        input.request.sourcePackReferences?.length ||
        input.researchDispatchPlan,
    );
    const safeguard = this.safeguardService.evaluate({
      seoPack: input.seoPack,
      contextPackAvailable: input.contextPackAvailable,
      structuredFallbackAvailable,
    });
    const adapterAvailable = Boolean(
      new ConsumerAdapterRegistry(input.consumerAdapters).findAdapter(
        request.consumerKey,
        request.objective,
      ),
    );

    return {
      request,
      contextRequirements,
      generationContext: this.generationContextService.build(
        { ...input, request },
        focusedResearch,
        safeguard,
        adapterAvailable,
      ),
    };
  }
}
