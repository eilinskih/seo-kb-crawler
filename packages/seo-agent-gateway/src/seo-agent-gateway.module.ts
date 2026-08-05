import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { KnexSeoAgentGatewayRepository } from './persistence/knex-seo-agent-gateway.repository';
import { SeoAgentGenerationRuntimeService } from './seo-agent-generation-runtime.service';
import { SeoAgentGatewayService } from './seo-agent-gateway.service';
import { SEO_AGENT_GATEWAY_REPOSITORY } from './seo-agent-gateway.tokens';
import { SeoAgentPromptRendererService } from './seo-agent-prompt-renderer.service';

@Module({
  imports: [DbModule],
  providers: [
    SeoAgentGatewayService,
    SeoAgentPromptRendererService,
    KnexSeoAgentGatewayRepository,
    {
      provide: SEO_AGENT_GATEWAY_REPOSITORY,
      useExisting: KnexSeoAgentGatewayRepository,
    },
    {
      provide: SeoAgentGenerationRuntimeService,
      useFactory: (
        gateway: SeoAgentGatewayService,
        promptRenderer: SeoAgentPromptRendererService,
        repository: KnexSeoAgentGatewayRepository,
      ) =>
        new SeoAgentGenerationRuntimeService(
          gateway,
          promptRenderer,
          [],
          repository,
        ),
      inject: [
        SeoAgentGatewayService,
        SeoAgentPromptRendererService,
        SEO_AGENT_GATEWAY_REPOSITORY,
      ],
    },
  ],
  exports: [
    SEO_AGENT_GATEWAY_REPOSITORY,
    KnexSeoAgentGatewayRepository,
    SeoAgentGatewayService,
    SeoAgentPromptRendererService,
    SeoAgentGenerationRuntimeService,
  ],
})
export class SeoAgentGatewayModule {}
