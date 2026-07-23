import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Redirect,
} from '@nestjs/common';

import {
  OperatorConsoleApiClient,
  OperatorCreateTopicCommand,
  OperatorDispatchCommand,
} from './operator-console-api.client';
import { renderOperatorConsoleHtml } from './operator-console.renderer';
import { OperatorConsoleService } from './operator-console.service';
import { OperatorConsoleViewModel } from './operator-console.types';

@Controller()
export class OperatorConsoleController {
  constructor(
    private readonly consoleService: OperatorConsoleService,
    private readonly apiClient: OperatorConsoleApiClient,
  ) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  async index(): Promise<string> {
    return renderOperatorConsoleHtml(await this.consoleService.buildViewModel());
  }

  @Get('status')
  status(): Promise<OperatorConsoleViewModel> {
    return this.consoleService.buildViewModel();
  }

  @Post('topics')
  @Redirect('/', 303)
  async createTopic(@Body() body: Record<string, unknown>): Promise<void> {
    await this.apiClient.createTopic(toCreateTopicCommand(body));
  }

  @Post('topics/:id/pause')
  @Redirect('/', 303)
  async pauseTopic(@Param('id') id: string): Promise<void> {
    await this.apiClient.pauseTopic(id);
  }

  @Post('topics/:id/archive')
  @Redirect('/', 303)
  async archiveTopic(@Param('id') id: string): Promise<void> {
    await this.apiClient.archiveTopic(id);
  }

  @Post('topics/:id/reactivate')
  @Redirect('/', 303)
  async reactivateTopic(@Param('id') id: string): Promise<void> {
    await this.apiClient.reactivateTopic(id);
  }

  @Post('url-frontier/dispatch')
  @Redirect('/', 303)
  async dispatchUrlFrontier(
    @Body() body: Record<string, unknown>,
  ): Promise<void> {
    await this.apiClient.dispatchUrlFrontier(toDispatchCommand(body));
  }

  @Post('content-processing/dispatch')
  @Redirect('/', 303)
  async dispatchContentProcessing(
    @Body() body: Record<string, unknown>,
  ): Promise<void> {
    await this.apiClient.dispatchContentProcessing(toDispatchCommand(body));
  }
}

function toCreateTopicCommand(
  body: Record<string, unknown>,
): OperatorCreateTopicCommand {
  return {
    slug: requiredText(body.slug, 'slug'),
    name: requiredText(body.name, 'name'),
    description: optionalText(body.description),
    seedUrls: lines(body.seedUrls),
    seedKeywords: lines(body.seedKeywords),
    language: optionalText(body.language) ?? 'en',
    countryCode: optionalText(body.countryCode) ?? 'US',
    maxPages: positiveInteger(body.maxPages, 100),
  };
}

function requiredText(value: unknown, field: string): string {
  const normalized = optionalText(value);
  if (!normalized) {
    throw new Error(`${field} is required`);
  }
  return normalized;
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function lines(value: unknown): string[] {
  return typeof value === 'string'
    ? value.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)
    : [];
}

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isInteger(parsed) && parsed > 0
    ? parsed
    : fallback;
}

function toDispatchCommand(
  body: Record<string, unknown>,
): OperatorDispatchCommand {
  return {
    maxDispatches: Math.min(positiveInteger(body.maxDispatches, 10), 100),
  };
}
