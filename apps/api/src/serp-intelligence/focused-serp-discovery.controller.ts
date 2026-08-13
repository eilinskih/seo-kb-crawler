import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { SerpGeoTarget } from '@seo-kb/serp-intelligence';
import {
  FocusedSerpDiscoveryApiResult,
  FocusedSerpDiscoveryApiService,
} from './focused-serp-discovery.service';

interface FocusedSerpDiscoveryBody {
  topicId?: unknown;
  query?: unknown;
  language?: unknown;
  geo?: unknown;
  providerKey?: unknown;
  results?: unknown;
}

@Controller('serp-intelligence')
export class FocusedSerpDiscoveryController {
  constructor(
    private readonly service: FocusedSerpDiscoveryApiService,
  ) {}

  @Post('focused-discovery')
  async focusedDiscovery(
    @Body() body: FocusedSerpDiscoveryBody,
  ): Promise<FocusedSerpDiscoveryApiResult> {
    const requestBody = body ?? {};
    return this.service.run({
      topicId: requiredText(requestBody.topicId, 'topicId'),
      query: requiredText(requestBody.query, 'query'),
      language: optionalText(requestBody.language) ?? undefined,
      geo: geoTarget(requestBody.geo),
      providerKey: optionalText(requestBody.providerKey) ?? undefined,
      results: serpResults(requestBody.results),
    });
  }
}

function serpResults(value: unknown): Array<{
  url: string;
  title?: string | null;
  snippet?: string | null;
  position?: number;
}> {
  if (!Array.isArray(value) || value.length === 0) {
    throw new BadRequestException('results must be a non-empty array');
  }

  return value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new BadRequestException(`results[${index}] must be an object`);
    }
    const result = item as Record<string, unknown>;
    return {
      url: requiredText(result.url, `results[${index}].url`),
      title: optionalText(result.title),
      snippet: optionalText(result.snippet),
      position: optionalInteger(result.position),
    };
  });
}

function geoTarget(value: unknown): SerpGeoTarget | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'object') {
    throw new BadRequestException('geo must be an object');
  }
  const geo = value as Record<string, unknown>;
  return {
    countryCode: optionalText(geo.countryCode) ?? undefined,
    regionCode: optionalText(geo.regionCode) ?? undefined,
    city: optionalText(geo.city) ?? undefined,
  };
}

function requiredText(value: unknown, field: string): string {
  const normalized = optionalText(value);
  if (!normalized) {
    throw new BadRequestException(`${field} is required`);
  }
  return normalized;
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function optionalInteger(value: unknown): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new BadRequestException('position must be a positive integer');
  }
  return value;
}
