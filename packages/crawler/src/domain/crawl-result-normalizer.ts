import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CrawlerValidationError } from './crawler-errors';
import {
  CrawlAdapterResult,
  CrawlCommand,
  CrawlerAdapter,
  ExtractedCrawlLink,
  MediaAssetMetadata,
  NormalizedCrawlResult,
  RedirectEvidence,
} from './crawler-types';

const maxUrlLength = 4096;
const maxTextLength = 1000;
const maxHeaderLength = 2000;
const maxFailureDetailLength = 1000;
const artifactFieldLength = 500_000;

@Injectable()
export class CrawlResultNormalizer {
  normalize(
    command: CrawlCommand,
    adapter: Pick<CrawlerAdapter, 'key' | 'version'>,
    result: CrawlAdapterResult,
  ): NormalizedCrawlResult {
    const rawHtml = normalizeOptionalText(
      result.rawHtml,
      'rawHtml',
      artifactFieldLength,
    );
    const cleanedMarkdown = normalizeOptionalText(
      result.cleanedMarkdown,
      'cleanedMarkdown',
      artifactFieldLength,
    );
    const plainText = normalizeOptionalText(
      result.plainText,
      'plainText',
      artifactFieldLength,
    );

    return {
      attemptId: command.attemptId,
      frontierEntryId: command.frontierEntryId,
      topicId: command.topicId,
      topicConfigurationVersion: command.topicConfigurationVersion,
      requestedUrl: command.normalizedUrl,
      status: result.status,
      finalUrl: normalizeOptionalUrl(result.finalUrl, 'finalUrl'),
      statusCode: normalizeOptionalStatusCode(result.statusCode),
      headers: normalizeHeaders(result.headers),
      redirectChain: normalizeRedirects(result.redirectChain),
      canonicalUrl: normalizeOptionalUrl(result.canonicalUrl, 'canonicalUrl'),
      title: normalizeOptionalText(result.title, 'title', maxTextLength),
      metaDescription: normalizeOptionalText(
        result.metaDescription,
        'metaDescription',
        maxTextLength,
      ),
      rawHtml,
      cleanedMarkdown,
      plainText,
      contentHash: contentHash(rawHtml, cleanedMarkdown, plainText),
      outgoingLinks: normalizeLinks(result.outgoingLinks, command),
      mediaAssets: normalizeMediaAssets(result.mediaAssets, command),
      timing: {
        ...result.timing,
        totalMs: assertNonNegativeNumber(result.timing.totalMs, 'timing.totalMs'),
      },
      adapter: {
        key: adapter.key,
        version: adapter.version,
      },
      failure: result.failure
        ? {
            category: result.failure.category,
            detail: normalizeRequiredText(
              result.failure.detail,
              'failure.detail',
              maxFailureDetailLength,
            ),
            retryable: result.failure.retryable === true,
          }
        : null,
    };
  }
}

function normalizeHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> {
  if (!headers) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      normalizeRequiredText(key.toLowerCase(), 'header key', 100),
      normalizeRequiredText(value, `header ${key}`, maxHeaderLength),
    ]),
  );
}

function normalizeRedirects(
  redirects: RedirectEvidence[] | undefined,
): RedirectEvidence[] {
  return (redirects ?? []).map((redirect, index) => ({
    fromUrl: normalizeUrl(redirect.fromUrl, `redirectChain[${index}].fromUrl`),
    toUrl: normalizeUrl(redirect.toUrl, `redirectChain[${index}].toUrl`),
    statusCode: normalizeOptionalStatusCode(redirect.statusCode),
  }));
}

function normalizeLinks(
  links: ExtractedCrawlLink[] | undefined,
  command: CrawlCommand,
): ExtractedCrawlLink[] {
  return (links ?? []).slice(0, command.policy.maxOutgoingLinks).map(
    (link, index) => ({
      href: normalizeRequiredText(link.href, `outgoingLinks[${index}].href`, 2048),
      resolvedUrl: normalizeUrl(
        link.resolvedUrl,
        `outgoingLinks[${index}].resolvedUrl`,
      ),
      anchorText: normalizeOptionalText(
        link.anchorText,
        `outgoingLinks[${index}].anchorText`,
        maxTextLength,
      ),
      rel: link.rel?.map((token, tokenIndex) =>
        normalizeRequiredText(
          token,
          `outgoingLinks[${index}].rel[${tokenIndex}]`,
          50,
        ),
      ),
      sourceElement: normalizeOptionalText(
        link.sourceElement,
        `outgoingLinks[${index}].sourceElement`,
        100,
      ),
      position:
        link.position === undefined
          ? undefined
          : assertNonNegativeInteger(
              link.position,
              `outgoingLinks[${index}].position`,
            ),
      metadata: link.metadata ?? {},
    }),
  );
}

function normalizeMediaAssets(
  mediaAssets: MediaAssetMetadata[] | undefined,
  command: CrawlCommand,
): MediaAssetMetadata[] {
  return (mediaAssets ?? []).slice(0, command.policy.maxMediaAssets).map(
    (asset, index) => ({
      resolvedUrl: normalizeUrl(asset.resolvedUrl, `mediaAssets[${index}].url`),
      elementType: normalizeRequiredText(
        asset.elementType,
        `mediaAssets[${index}].elementType`,
        50,
      ),
      altText: normalizeOptionalText(
        asset.altText,
        `mediaAssets[${index}].altText`,
        maxTextLength,
      ),
      width:
        asset.width === undefined
          ? undefined
          : assertPositiveInteger(asset.width, `mediaAssets[${index}].width`),
      height:
        asset.height === undefined
          ? undefined
          : assertPositiveInteger(asset.height, `mediaAssets[${index}].height`),
      mimeType: normalizeOptionalText(
        asset.mimeType,
        `mediaAssets[${index}].mimeType`,
        100,
      ),
      byteLength:
        asset.byteLength === undefined
          ? undefined
          : assertNonNegativeInteger(
              asset.byteLength,
              `mediaAssets[${index}].byteLength`,
            ),
      position:
        asset.position === undefined
          ? undefined
          : assertNonNegativeInteger(
              asset.position,
              `mediaAssets[${index}].position`,
            ),
    }),
  );
}

function contentHash(
  rawHtml: string | undefined,
  cleanedMarkdown: string | undefined,
  plainText: string | undefined,
): string | null {
  const content = rawHtml ?? cleanedMarkdown ?? plainText;
  return content
    ? createHash('sha256').update(content).digest('hex')
    : null;
}

function normalizeOptionalUrl(
  value: string | undefined,
  field: string,
): string | undefined {
  return value === undefined ? undefined : normalizeUrl(value, field);
}

function normalizeUrl(value: string, field: string): string {
  const normalized = normalizeRequiredText(value, field, maxUrlLength);
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new CrawlerValidationError(`${field} must be a valid URL`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new CrawlerValidationError(`${field} must use http or https`);
  }
  return url.href;
}

function normalizeOptionalStatusCode(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isInteger(value) || value < 100 || value > 599) {
    throw new CrawlerValidationError('statusCode must be a valid HTTP status');
  }
  return value;
}

function normalizeRequiredText(
  value: string,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== 'string') {
    throw new CrawlerValidationError(`${field} must be a string`);
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new CrawlerValidationError(`${field} is required`);
  }
  if (normalized.length > maxLength) {
    throw new CrawlerValidationError(`${field} exceeds ${maxLength} characters`);
  }
  return normalized;
}

function normalizeOptionalText(
  value: string | undefined,
  field: string,
  maxLength: number,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    return undefined;
  }
  if (normalized.length > maxLength) {
    throw new CrawlerValidationError(`${field} exceeds ${maxLength} characters`);
  }
  return normalized;
}

function assertPositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new CrawlerValidationError(`${field} must be a positive integer`);
  }
  return value;
}

function assertNonNegativeInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new CrawlerValidationError(`${field} must be a non-negative integer`);
  }
  return value;
}

function assertNonNegativeNumber(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new CrawlerValidationError(`${field} must be a non-negative number`);
  }
  return value;
}
