import { Module } from '@nestjs/common';

import { OperatorConsoleController } from './operator-console.controller';
import { OperatorConsoleService } from './operator-console.service';

@Module({
  controllers: [OperatorConsoleController],
  providers: [OperatorConsoleService],
})
export class OperatorConsoleModule {}
