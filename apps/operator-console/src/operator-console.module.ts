import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExternalSeoDataProvidersModule } from '@seo-kb/external-seo-data-providers';

import { OperatorConsoleAccessControlService } from './operator-console-access-control.service';
import { OperatorConsoleApiClient } from './operator-console-api.client';
import { OperatorConsoleAuthGuard } from './operator-console-auth.guard';
import { OperatorConsoleController } from './operator-console.controller';
import { OperatorConsoleService } from './operator-console.service';

@Module({
  imports: [ConfigModule, ExternalSeoDataProvidersModule],
  controllers: [OperatorConsoleController],
  providers: [
    OperatorConsoleAccessControlService,
    OperatorConsoleAuthGuard,
    OperatorConsoleApiClient,
    OperatorConsoleService,
  ],
})
export class OperatorConsoleModule {}
