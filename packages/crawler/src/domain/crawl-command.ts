import { CrawlerValidationError } from './crawler-errors';
import {
  CrawlCommand,
  CrawlCommandPayload,
  CrawlPolicySnapshot,
} from './crawler-types';

const maxIdentityLength = 100;
const maxFingerprintLength = 200;
const maxUrlLength = 4096;

export function createCrawlCommand(payload: CrawlCommandPayload): CrawlCommand {
  const leaseExpiresAt = parseDate(payload.leaseExpiresAt, 'leaseExpiresAt');
  const deadline = parseDate(payload.deadline, 'deadline');

  if (deadline > leaseExpiresAt) {
    throw new CrawlerValidationError('deadline must not exceed leaseExpiresAt');
  }

  return {
    attemptId: normalizeRequiredText(
      payload.attemptId,
      'attemptId',
      maxIdentityLength,
    ),
    frontierEntryId: normalizeRequiredText(
      payload.frontierEntryId,
      'frontierEntryId',
      maxIdentityLength,
    ),
    topicId: normalizeRequiredText(payload.topicId, 'topicId', maxIdentityLength),
    topicConfigurationVersion: assertPositiveInteger(
      payload.topicConfigurationVersion,
      'topicConfigurationVersion',
    ),
    normalizedUrl: normalizeHttpUrl(payload.normalizedUrl, 'normalizedUrl'),
    crawlPolicyFingerprint: normalizeRequiredText(
      payload.crawlPolicyFingerprint,
      'crawlPolicyFingerprint',
      maxFingerprintLength,
    ),
    leaseExpiresAt,
    deadline,
    policy: normalizePolicy(payload.policy),
  };
}

function normalizePolicy(policy: CrawlPolicySnapshot): CrawlPolicySnapshot {
  if (!policy || typeof policy !== 'object') {
    throw new CrawlerValidationError('policy is required');
  }

  return {
    userAgent: normalizeRequiredText(policy.userAgent, 'policy.userAgent', 200),
    respectRobots: policy.respectRobots === true,
    allowedHosts: normalizeOptionalStringArray(
      policy.allowedHosts,
      'policy.allowedHosts',
      500,
      255,
    ),
    deniedHosts: normalizeOptionalStringArray(
      policy.deniedHosts,
      'policy.deniedHosts',
      500,
      255,
    ),
    includedPathPatterns: normalizeOptionalStringArray(
      policy.includedPathPatterns,
      'policy.includedPathPatterns',
      200,
      500,
    ),
    excludedPathPatterns: normalizeOptionalStringArray(
      policy.excludedPathPatterns,
      'policy.excludedPathPatterns',
      200,
      500,
    ),
    crossHostCanonicalPolicy: normalizeCrossHostCanonicalPolicy(
      policy.crossHostCanonicalPolicy,
    ),
    requiresJavaScript: policy.requiresJavaScript === true,
    requiresMarkdown: policy.requiresMarkdown === true,
    requiresPlainText: policy.requiresPlainText === true,
    maxBodyBytes: assertPositiveInteger(policy.maxBodyBytes, 'policy.maxBodyBytes'),
    maxRedirects: assertNonNegativeInteger(
      policy.maxRedirects,
      'policy.maxRedirects',
    ),
    timeoutMs: assertPositiveInteger(policy.timeoutMs, 'policy.timeoutMs'),
    maxOutgoingLinks: assertNonNegativeInteger(
      policy.maxOutgoingLinks,
      'policy.maxOutgoingLinks',
    ),
    maxMediaAssets: assertNonNegativeInteger(
      policy.maxMediaAssets,
      'policy.maxMediaAssets',
    ),
    recrawlIntervalHours: normalizeOptionalPositiveInteger(
      policy.recrawlIntervalHours,
      'policy.recrawlIntervalHours',
    ),
    minRecrawlIntervalHours: normalizeOptionalPositiveInteger(
      policy.minRecrawlIntervalHours,
      'policy.minRecrawlIntervalHours',
    ),
    maxRecrawlIntervalHours: normalizeOptionalPositiveInteger(
      policy.maxRecrawlIntervalHours,
      'policy.maxRecrawlIntervalHours',
    ),
  };
}

function normalizeOptionalStringArray(
  values: string[] | undefined,
  field: string,
  maxItems: number,
  maxItemLength: number,
): string[] | undefined {
  if (values === undefined) {
    return undefined;
  }
  if (!Array.isArray(values)) {
    throw new CrawlerValidationError(`${field} must be an array`);
  }
  if (values.length > maxItems) {
    throw new CrawlerValidationError(`${field} exceeds ${maxItems} items`);
  }
  return values.map((value, index) =>
    normalizeRequiredText(value, `${field}[${index}]`, maxItemLength),
  );
}

function normalizeCrossHostCanonicalPolicy(
  value: CrawlPolicySnapshot['crossHostCanonicalPolicy'],
): CrawlPolicySnapshot['crossHostCanonicalPolicy'] {
  if (value === undefined) {
    return undefined;
  }
  if (value !== 'same-host' && value !== 'allowed-hosts') {
    throw new CrawlerValidationError(
      'policy.crossHostCanonicalPolicy must be same-host or allowed-hosts',
    );
  }
  return value;
}

function normalizeHttpUrl(value: string, field: string): string {
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

function parseDate(value: Date | string, field: string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new CrawlerValidationError(`${field} must be a valid date`);
  }
  return date;
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

function assertPositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new CrawlerValidationError(`${field} must be a positive integer`);
  }
  return value;
}

function normalizeOptionalPositiveInteger(
  value: number | undefined,
  field: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  return assertPositiveInteger(value, field);
}

function assertNonNegativeInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new CrawlerValidationError(`${field} must be a non-negative integer`);
  }
  return value;
}
