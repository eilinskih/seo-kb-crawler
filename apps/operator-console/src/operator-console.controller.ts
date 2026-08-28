import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Redirect,
  UseGuards,
} from '@nestjs/common';

import {
  OperatorConsoleApiClient,
  OperatorCreateTopicCommand,
  OperatorDispatchCommand,
  OperatorFocusedSerpDiscoveryCommand,
  OperatorReviewExternalEntityCommand,
  OperatorReviewAliasCommand,
  OperatorUpdateTopicCommand,
} from './operator-console-api.client';
import { OperatorConsoleAuthGuard } from './operator-console-auth.guard';
import {
  renderOperatorConsoleHtml,
  renderOperatorFailureDetailHtml,
  renderOperatorProviderDetailHtml,
  renderOperatorTopicDetailHtml,
} from './operator-console.renderer';
import { OperatorFailureStageKey } from './operator-console.types';
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
  async index(@Query('flash') flash?: string): Promise<string> {
    return renderOperatorConsoleHtml(
      await this.consoleService.buildViewModel(
        new Date(),
        optionalText(flash),
      ),
    );
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

  @Get('failures/:stage')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async failureDetail(@Param('stage') stage: string): Promise<string> {
    return renderOperatorFailureDetailHtml(
      await this.consoleService.buildFailureDetailViewModel(
        failureStageKey(stage),
      ),
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

  @Post('serp-intelligence/focused-discovery')
  @Redirect('/', 303)
  async focusedSerpDiscovery(
    @Body() body: Record<string, unknown>,
  ): Promise<void> {
    await this.apiClient.runFocusedSerpDiscovery(
      toFocusedSerpDiscoveryCommand(body),
    );
  }

  @Post('topics/:id/discover-serp')
  @Redirect('/', 303)
  async discoverTopicSerp(@Param('id') id: string): Promise<{ url: string }> {
    const result = await this.apiClient.runFocusedSerpDiscoveryForTopic(id);
    return {
      url: `/?flash=${encodeURIComponent(serpDiscoveryFlash(result))}`,
    };
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

function toFocusedSerpDiscoveryCommand(
  body: Record<string, unknown>,
): OperatorFocusedSerpDiscoveryCommand {
  const resultUrls = lines(body.resultUrls).slice(0, 10);
  if (resultUrls.length === 0) {
    throw new Error('resultUrls is required');
  }
  return {
    topicId: requiredText(body.topicId, 'topicId'),
    query: requiredText(body.query, 'query'),
    language: optionalText(body.language) ?? 'pl',
    countryCode: optionalText(body.countryCode) ?? 'PL',
    city: optionalText(body.city),
    resultUrls,
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

function serpDiscoveryFlash(result: {
  status: string;
  providerKey: string;
  warnings: string[];
  observations: { submitted: number };
  frontier: { upsertedEntries?: number } | null;
}): string {
  if (result.status === 'recorded') {
    return [
      `SERP discovery recorded via ${result.providerKey}.`,
      `Submitted ${result.observations.submitted} URL observations.`,
      `Frontier upserts: ${result.frontier?.upsertedEntries ?? 0}.`,
      ...result.warnings,
    ].join(' ');
  }
  return [
    `SERP discovery degraded via ${result.providerKey}.`,
    ...result.warnings,
  ].join(' ');
}

function failureStageKey(value: string): OperatorFailureStageKey {
  if (value === 'content-processing' || value === 'chunking') {
    return value;
  }
  throw new Error('Unknown failure stage');
}
