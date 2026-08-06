import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Redirect,
  UseGuards,
} from '@nestjs/common';

import {
  OperatorConsoleApiClient,
  OperatorCreateTopicCommand,
  OperatorDispatchCommand,
  OperatorReviewExternalEntityCommand,
  OperatorReviewAliasCommand,
  OperatorUpdateTopicCommand,
} from './operator-console-api.client';
import { OperatorConsoleAuthGuard } from './operator-console-auth.guard';
import {
  renderOperatorConsoleHtml,
  renderOperatorProviderDetailHtml,
  renderOperatorTopicDetailHtml,
} from './operator-console.renderer';
import { OperatorConsoleService } from './operator-console.service';
import { OperatorConsoleViewModel } from './operator-console.types';

@UseGuards(OperatorConsoleAuthGuard)
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

  @Get('topics/:id')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async topicDetail(@Param('id') id: string): Promise<string> {
    return renderOperatorTopicDetailHtml(
      await this.consoleService.buildTopicDetailViewModel(id),
    );
  }

  @Get('providers/:key')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async providerDetail(@Param('key') key: string): Promise<string> {
    return renderOperatorProviderDetailHtml(
      await this.consoleService.buildProviderDetailViewModel(key),
    );
  }

  @Post('topics')
  @Redirect('/', 303)
  async createTopic(@Body() body: Record<string, unknown>): Promise<void> {
    await this.apiClient.createTopic(toCreateTopicCommand(body));
  }

  @Post('topics/:id/configuration')
  @Redirect('/', 303)
  async updateTopicConfiguration(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ): Promise<void> {
    await this.apiClient.updateTopicConfiguration(
      id,
      toUpdateTopicCommand(body),
    );
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

  @Post('review/aliases/:id/approve')
  @Redirect('/', 303)
  async approveAlias(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ): Promise<void> {
    await this.apiClient.approveAlias(id, toReviewAliasCommand(body));
  }

  @Post('review/aliases/:id/reject')
  @Redirect('/', 303)
  async rejectAlias(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ): Promise<void> {
    await this.apiClient.rejectAlias(id, toReviewAliasCommand(body));
  }

  @Post('review/external-entities/accept')
  @Redirect('/', 303)
  async acceptExternalEntity(
    @Body() body: Record<string, unknown>,
  ): Promise<void> {
    await this.apiClient.acceptExternalEntity(
      toReviewExternalEntityCommand(body),
    );
  }

  @Post('review/external-entities/reject')
  @Redirect('/', 303)
  async rejectExternalEntity(
    @Body() body: Record<string, unknown>,
  ): Promise<void> {
    await this.apiClient.rejectExternalEntity(
      toReviewExternalEntityCommand(body),
    );
  }
}

function toCreateTopicCommand(
  body: Record<string, unknown>,
): OperatorCreateTopicCommand {
  return {
    ...toTopicFormCommand(body),
    slug: requiredText(body.slug, 'slug'),
  };
}

function toTopicFormCommand(
  body: Record<string, unknown>,
): Omit<OperatorCreateTopicCommand, 'slug'> {
  return {
    name: requiredText(body.name, 'name'),
    description: optionalText(body.description),
    seedUrls: lines(body.seedUrls),
    seedKeywords: lines(body.seedKeywords),
    language: optionalText(body.language) ?? 'en',
    countryCode: optionalText(body.countryCode) ?? 'US',
    maxPages: positiveInteger(body.maxPages, 100),
  };
}

function toUpdateTopicCommand(
  body: Record<string, unknown>,
): OperatorUpdateTopicCommand {
  return {
    ...toTopicFormCommand(body),
    slug: 'unchanged',
    expectedConfigurationVersion: positiveInteger(
      body.expectedConfigurationVersion,
      1,
    ),
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

function toReviewAliasCommand(
  body: Record<string, unknown>,
): OperatorReviewAliasCommand {
  return {
    reviewedBy: optionalText(body.reviewedBy) ?? 'operator-console',
    note: optionalText(body.note),
  };
}

function toReviewExternalEntityCommand(
  body: Record<string, unknown>,
): OperatorReviewExternalEntityCommand {
  return {
    attemptId: requiredText(body.attemptId, 'attemptId'),
    subjectType: externalEntitySubjectType(body.subjectType),
    providerKey: requiredText(body.providerKey, 'providerKey'),
    externalId: optionalText(body.externalId),
    externalIdType: optionalText(body.externalIdType),
    candidateName: optionalText(body.candidateName),
    reviewedBy: optionalText(body.reviewedBy) ?? 'operator-console',
    note: optionalText(body.note),
  };
}

function externalEntitySubjectType(value: unknown): 'external_id' | 'candidate' {
  if (value === 'external_id' || value === 'candidate') {
    return value;
  }
  throw new Error('subjectType is required');
}
