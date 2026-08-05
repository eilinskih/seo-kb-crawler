import { Module } from '@nestjs/common';
import { SeoAgentGenerationRuntimeService } from './seo-agent-generation-runtime.service';
import { SeoAgentGatewayService } from './seo-agent-gateway.service';
import { SeoAgentPromptRendererService } from './seo-agent-prompt-renderer.service';

@Module({
  providers: [
    SeoAgentGatewayService,
    SeoAgentPromptRendererService,
    SeoAgentGenerationRuntimeService,
  ],
  exports: [
    SeoAgentGatewayService,
    SeoAgentPromptRendererService,
    SeoAgentGenerationRuntimeService,
  ],
})
export class SeoAgentGatewayModule {}
