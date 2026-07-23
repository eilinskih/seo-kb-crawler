import { Module } from '@nestjs/common';
import { SeoAgentGatewayService } from './seo-agent-gateway.service';

@Module({
  providers: [SeoAgentGatewayService],
  exports: [SeoAgentGatewayService],
})
export class SeoAgentGatewayModule {}
