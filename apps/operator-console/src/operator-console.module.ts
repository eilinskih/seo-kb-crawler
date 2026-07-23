import { Module } from '@nestjs/common';

import { OperatorConsoleApiClient } from './operator-console-api.client';
import { OperatorConsoleController } from './operator-console.controller';
import { OperatorConsoleService } from './operator-console.service';

@Module({
  controllers: [OperatorConsoleController],
  providers: [
    OperatorConsoleApiClient,
    OperatorConsoleService,
  ],
})
export class OperatorConsoleModule {}
