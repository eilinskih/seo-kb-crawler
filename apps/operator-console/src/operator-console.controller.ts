import { Controller, Get, Header } from '@nestjs/common';

import { renderOperatorConsoleHtml } from './operator-console.renderer';
import { OperatorConsoleService } from './operator-console.service';
import { OperatorConsoleViewModel } from './operator-console.types';

@Controller()
export class OperatorConsoleController {
  constructor(private readonly consoleService: OperatorConsoleService) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  index(): string {
    return renderOperatorConsoleHtml(this.consoleService.buildViewModel());
  }

  @Get('status')
  status(): OperatorConsoleViewModel {
    return this.consoleService.buildViewModel();
  }
}
