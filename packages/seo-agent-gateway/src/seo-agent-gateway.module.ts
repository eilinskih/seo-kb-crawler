import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DbModule } from '@seo-kb/db';
import { KnexSeoAgentGatewayRepository } from './persistence/knex-seo-agent-gateway.repository';
import { configuredSeoAgentGenerationProviders } from './providers/seo-agent-generation-provider.factory';
import { SeoAgentGenerationRuntimeService } from './seo-agent-generation-runtime.service';
import { SeoAgentGatewayService } from './seo-agent-gateway.service';
import { SEO_AGENT_GATEWAY_REPOSITORY } from './seo-agent-gateway.tokens';
import { SeoAgentPromptRendererService } from './seo-agent-prompt-renderer.service';

@Module({
  imports: [ConfigModule, DbModule],
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
        config: ConfigService,
      ) =>
        new SeoAgentGenerationRuntimeService(
          gateway,
          promptRenderer,
          configuredSeoAgentGenerationProviders(config),
          repository,
        ),
      inject: [
        SeoAgentGatewayService,
        SeoAgentPromptRendererService,
        SEO_AGENT_GATEWAY_REPOSITORY,
        ConfigService,
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
