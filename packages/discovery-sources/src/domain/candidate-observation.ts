import { createHash } from 'node:crypto';
import { DiscoveryValidationError } from './discovery-errors';
import {
  CandidateObservation,
  DiscoverySourceType,
} from './discovery-types';

const maxUrlLength = 4096;
const maxTextLength = 1000;

export interface CandidateObservationInput {
  topicId: string;
  topicConfigurationVersion: number;
  discoveryRunId: string;
  sourceType: DiscoverySourceType;
  sourceKey: string;
  discoveredUrl: string;
  providerItemIdentity: string;
  discoveredAt?: Date;
  sourceUrl?: string;
  title?: string;
  snippet?: string;
  anchorText?: string;
  sourceRank?: number;
  metadata?: Record<string, unknown>;
}

export function createCandidateObservation(
  input: CandidateObservationInput,
): CandidateObservation {
  const discoveredUrl = normalizeRequiredText(
    input.discoveredUrl,
    'discoveredUrl',
    maxUrlLength,
  );
  const providerItemIdentity = normalizeRequiredText(
    input.providerItemIdentity,
    'providerItemIdentity',
    500,
  );

  return {
    topicId: normalizeRequiredText(input.topicId, 'topicId', 100),
    topicConfigurationVersion: assertPositiveInteger(
      input.topicConfigurationVersion,
      'topicConfigurationVersion',
    ),
    discoveryRunId: normalizeRequiredText(
      input.discoveryRunId,
      'discoveryRunId',
      100,
    ),
    sourceType: input.sourceType,
    sourceKey: normalizeRequiredText(input.sourceKey, 'sourceKey', 200),
    discoveredUrl,
    discoveredAt: input.discoveredAt ?? new Date(),
    sourceUrl: normalizeOptionalText(input.sourceUrl, 'sourceUrl', maxUrlLength),
    title: normalizeOptionalText(input.title, 'title', maxTextLength),
    snippet: normalizeOptionalText(input.snippet, 'snippet', maxTextLength),
    anchorText: normalizeOptionalText(
      input.anchorText,
      'anchorText',
      maxTextLength,
    ),
    sourceRank:
      input.sourceRank === undefined
        ? undefined
        : assertPositiveInteger(input.sourceRank, 'sourceRank'),
    metadata: normalizeMetadata(input.metadata),
    idempotencyKey: candidateObservationIdempotencyKey({
      topicId: input.topicId,
      topicConfigurationVersion: input.topicConfigurationVersion,
      discoveryRunId: input.discoveryRunId,
      sourceType: input.sourceType,
      sourceKey: input.sourceKey,
      discoveredUrl,
      providerItemIdentity,
    }),
  };
}

export interface CandidateObservationIdentityInput {
  topicId: string;
  topicConfigurationVersion: number;
  discoveryRunId: string;
  sourceType: DiscoverySourceType;
  sourceKey: string;
  discoveredUrl: string;
  providerItemIdentity: string;
}

export function candidateObservationIdempotencyKey(
  input: CandidateObservationIdentityInput,
): string {
  return createHash('sha256')
    .update(input.topicId)
    .update('\0')
    .update(String(input.topicConfigurationVersion))
    .update('\0')
    .update(input.discoveryRunId)
    .update('\0')
    .update(input.sourceType)
    .update('\0')
    .update(input.sourceKey)
    .update('\0')
    .update(input.discoveredUrl)
    .update('\0')
    .update(input.providerItemIdentity)
    .digest('hex');
}

function normalizeRequiredText(
  value: string,
  field: string,
  maxLength: number,
): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new DiscoveryValidationError(`${field} is required`);
  }
  if (normalized.length > maxLength) {
    throw new DiscoveryValidationError(`${field} exceeds ${maxLength} characters`);
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
    throw new DiscoveryValidationError(`${field} exceeds ${maxLength} characters`);
  }
  return normalized;
}

function assertPositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new DiscoveryValidationError(`${field} must be a positive integer`);
  }
  return value;
}

function normalizeMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (metadata === undefined) {
    return {};
  }
  const serialized = JSON.stringify(metadata);
  if (serialized.length > 4000) {
    throw new DiscoveryValidationError('metadata exceeds 4000 serialized bytes');
  }
  return structuredClone(metadata);
}
