import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import {
  UrlFrontierDispatchBatchResult,
  UrlFrontierDispatchService,
} from '@seo-kb/url-frontier';

interface DispatchRequestBody {
  leaseOwner?: unknown;
  leaseDurationMs?: unknown;
  maxDispatches?: unknown;
}

const defaultLeaseDurationMs = 60_000;
const defaultMaxDispatches = 10;
const maxDispatchesLimit = 100;

@Controller('url-frontier')
export class UrlFrontierDispatchController {
  constructor(
    private readonly dispatchService: UrlFrontierDispatchService,
  ) {}

  @Post('dispatch')
  async dispatch(
    @Body() body: DispatchRequestBody,
  ): Promise<UrlFrontierDispatchBatchResult> {
    const requestBody = body ?? {};
    return this.dispatchService.dispatchBatch({
      leaseOwner: normalizeLeaseOwner(requestBody.leaseOwner),
      leaseDurationMs: normalizePositiveInteger(
        requestBody.leaseDurationMs,
        defaultLeaseDurationMs,
        'leaseDurationMs',
      ),
      maxDispatches: normalizePositiveInteger(
        requestBody.maxDispatches,
        defaultMaxDispatches,
        'maxDispatches',
        maxDispatchesLimit,
      ),
      now: new Date(),
    });
  }
}

function normalizeLeaseOwner(value: unknown): string {
  if (value === undefined) {
    return 'api-manual-dispatch';
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException('leaseOwner must be a non-empty string');
  }
  return value.trim().slice(0, 120);
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
