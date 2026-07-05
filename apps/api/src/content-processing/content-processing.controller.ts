import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import {
  ContentProcessingDispatchResult,
  ContentProcessingDispatchService,
  ContentProcessingService,
  ProcessCrawlAttemptResult,
} from '@seo-kb/content-processing';

interface ProcessCrawlAttemptRequestBody {
  crawlAttemptId?: unknown;
  extractorVersion?: unknown;
}

interface DispatchContentProcessingRequestBody {
  maxDispatches?: unknown;
  extractorVersion?: unknown;
}

const defaultMaxDispatches = 10;
const maxDispatchesLimit = 100;

@Controller('content-processing')
export class ContentProcessingController {
  constructor(
    private readonly contentProcessingService: ContentProcessingService,
    private readonly dispatchService: ContentProcessingDispatchService,
  ) {}

  @Post('process')
  async process(
    @Body() body: ProcessCrawlAttemptRequestBody,
  ): Promise<ProcessCrawlAttemptResult> {
    const requestBody = body ?? {};
    return this.contentProcessingService.processManualCrawlAttempt({
      crawlAttemptId: normalizeRequiredText(
        requestBody.crawlAttemptId,
        'crawlAttemptId',
        100,
      ),
      extractorVersion: normalizeOptionalText(
        requestBody.extractorVersion,
        'extractorVersion',
        80,
      ),
      now: new Date(),
    });
  }

  @Post('dispatch')
  async dispatch(
    @Body() body: DispatchContentProcessingRequestBody,
  ): Promise<ContentProcessingDispatchResult> {
    const requestBody = body ?? {};
    return this.dispatchService.dispatchPendingSuccessfulAttempts({
      maxDispatches: normalizePositiveInteger(
        requestBody.maxDispatches,
        defaultMaxDispatches,
        'maxDispatches',
        maxDispatchesLimit,
      ),
      extractorVersion: normalizeOptionalText(
        requestBody.extractorVersion,
        'extractorVersion',
        80,
      ),
    });
  }
}

function normalizeRequiredText(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${field} must be a non-empty string`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new BadRequestException(`${field} must be <= ${maxLength} characters`);
  }
  return normalized;
}

function normalizeOptionalText(
  value: unknown,
  field: string,
  maxLength: number,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${field} must be a non-empty string`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new BadRequestException(`${field} must be <= ${maxLength} characters`);
  }
  return normalized;
}

function normalizePositiveInteger(
  value: unknown,
  defaultValue: number,
  field: string,
  maxValue?: number,
): number {
  if (value === undefined) {
    return defaultValue;
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new BadRequestException(`${field} must be a positive integer`);
  }
  if (maxValue !== undefined && value > maxValue) {
    throw new BadRequestException(`${field} must be <= ${maxValue}`);
  }
  return value;
}
