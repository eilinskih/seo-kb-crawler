import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import {
  ContentProcessingService,
  ProcessCrawlAttemptResult,
} from '@seo-kb/content-processing';

interface ProcessCrawlAttemptRequestBody {
  crawlAttemptId?: unknown;
  extractorVersion?: unknown;
}

@Controller('content-processing')
export class ContentProcessingController {
  constructor(
    private readonly contentProcessingService: ContentProcessingService,
  ) {}

  @Post('process')
  async process(
    @Body() body: ProcessCrawlAttemptRequestBody,
  ): Promise<ProcessCrawlAttemptResult> {
    const requestBody = body ?? {};
    return this.contentProcessingService.processCrawlAttemptById({
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
