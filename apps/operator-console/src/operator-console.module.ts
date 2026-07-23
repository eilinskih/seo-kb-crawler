import { Module } from '@nestjs/common';
import { ExternalSeoDataProvidersModule } from '@seo-kb/external-seo-data-providers';

import { OperatorConsoleApiClient } from './operator-console-api.client';
import { OperatorConsoleController } from './operator-console.controller';
import { OperatorConsoleService } from './operator-console.service';

@Module({
  imports: [ExternalSeoDataProvidersModule],
  controllers: [OperatorConsoleController],
  providers: [
    OperatorConsoleApiClient,
    OperatorConsoleService,
  ],
})
export class OperatorConsoleModule {}
