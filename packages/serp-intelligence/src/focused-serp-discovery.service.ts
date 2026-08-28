import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  UrlFrontierDiscoveryObservation,
} from '@seo-kb/url-frontier';
import {
  SerpGeoTarget,
  SerpProviderMode,
  SerpQueryFeatures,
  SerpResult,
  SerpSnapshot,
} from './domain/serp-intelligence-types';
import { domainFromUrl, normalizeSerpText } from './normalize-serp-text';
import {
  SerpIntelligenceRepository,
} from './persistence/serp-intelligence.repository';
import { SERP_INTELLIGENCE_REPOSITORY } from './serp-intelligence.tokens';

export interface FocusedSerpResultInput {
  url: string;
  displayUrl?: string | null;
  clickUrl?: string | null;
  resolvedUrl?: string | null;
  urlResolutionStatus?: SerpResult['urlResolutionStatus'];
  title?: string | null;
  snippet?: string | null;
  position?: number;
}

export interface FocusedSerpDiscoveryCommand {
  topicId: string;
  topicConfigurationVersion: number;
  query: string;
  language?: string;
  geo?: SerpGeoTarget;
  providerKey?: string;
  providerMode?: SerpProviderMode;
  degraded?: boolean;
  warnings?: string[];
  results: FocusedSerpResultInput[];
  features?: Partial<SerpQueryFeatures>;
  capturedAt?: string;
}

export interface FocusedSerpDiscoveryResult {
  snapshot: SerpSnapshot;
  observations: UrlFrontierDiscoveryObservation[];
}

const defaultProviderKey = 'manual_serp_import';
const defaultProviderMode: SerpProviderMode = 'manual_import';
const topResultLimit = 10;

@Injectable()
export class FocusedSerpDiscoveryService {
  constructor(
    @Inject(SERP_INTELLIGENCE_REPOSITORY)
    private readonly repository: SerpIntelligenceRepository,
  ) {}

  async recordSnapshot(
    command: FocusedSerpDiscoveryCommand,
  ): Promise<FocusedSerpDiscoveryResult> {
    const snapshot = toSnapshot(command);
    await this.repository.saveSnapshot(snapshot);

    return {
      snapshot,
      observations: toObservations(snapshot, command.topicConfigurationVersion),
    };
  }
}

function toSnapshot(command: FocusedSerpDiscoveryCommand): SerpSnapshot {
  const query = normalizeRequiredText(command.query, 'query');
  const capturedAt = command.capturedAt ?? new Date().toISOString();
  const id = randomUUID();
  const results = normalizeResults(command.results, id);

  if (results.length === 0) {
    throw new Error('SERP snapshot requires at least one result URL');
  }

  return {
    id,
    query,
    normalizedQuery: normalizeSerpText(query),
    topicId: normalizeRequiredText(command.topicId, 'topicId'),
    language: command.language?.trim() || undefined,
    geo: command.geo,
    capturedAt,
    providerKey: command.providerKey?.trim() || defaultProviderKey,
    providerMode: command.providerMode ?? defaultProviderMode,
    degraded: command.degraded ?? false,
    warnings: command.warnings ?? [],
    results,
    features: normalizeFeatures(command.features),
  };
}

function normalizeFeatures(
  features: Partial<SerpQueryFeatures> | undefined,
): SerpQueryFeatures {
  return {
    peopleAlsoAsk: uniqueTexts(features?.peopleAlsoAsk ?? []),
    relatedSearches: uniqueTexts(features?.relatedSearches ?? []),
    autocompleteSuggestions: uniqueTexts(features?.autocompleteSuggestions ?? []),
  };
}

function normalizeResults(
  results: FocusedSerpResultInput[],
  snapshotId: string,
): SerpResult[] {
  if (!Array.isArray(results)) {
    throw new Error('results must be an array');
  }

  return results
    .slice(0, topResultLimit)
    .map((result, index) => {
      const url = normalizeHttpUrl(result.url);
      const position = result.position ?? index + 1;
      return {
        id: `${snapshotId}:result:${position}`,
        position,
        url,
        displayUrl: optionalText(result.displayUrl),
        clickUrl: optionalText(result.clickUrl),
        resolvedUrl: optionalText(result.resolvedUrl),
        urlResolutionStatus: result.urlResolutionStatus,
        canonicalUrl: null,
        domain: domainFromUrl(url),
        title: optionalText(result.title),
        snippet: optionalText(result.snippet),
        documentId: null,
        documentVersionId: null,
      };
    });
}

function toObservations(
  snapshot: SerpSnapshot,
  topicConfigurationVersion: number,
): UrlFrontierDiscoveryObservation[] {
  return snapshot.results.map((result) => ({
    topicId: snapshot.topicId ?? '',
    topicConfigurationVersion,
    discoveryRunId: snapshot.id,
    sourceType: 'search',
    sourceKey: [
      'serp',
      snapshot.providerKey,
      snapshot.normalizedQuery,
      snapshot.language ?? 'unknown',
      snapshot.geo?.countryCode ?? 'global',
      snapshot.geo?.city ?? 'anywhere',
    ].join(':'),
    discoveredUrl: result.url,
    discoveredAt: new Date(snapshot.capturedAt),
    title: result.title ?? undefined,
    snippet: result.snippet ?? undefined,
    sourceRank: result.position,
    metadata: {
      serpSnapshotId: snapshot.id,
      resultId: result.id,
      providerKey: snapshot.providerKey,
      providerMode: snapshot.providerMode,
      normalizedQuery: snapshot.normalizedQuery,
      displayUrl: result.displayUrl,
      clickUrl: result.clickUrl,
      resolvedUrl: result.resolvedUrl,
      urlResolutionStatus: result.urlResolutionStatus,
    },
    idempotencyKey: createHash('sha256')
      .update(['serp', snapshot.id, result.position, result.url].join(':'))
      .digest('hex'),
  }));
}

function normalizeRequiredText(value: string, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function optionalText(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function uniqueTexts(values: string[]): string[] {
  return [...new Set(values
    .map((value) => value.trim().replace(/\s+/gu, ' '))
    .filter(Boolean))]
    .slice(0, 50);
}

function normalizeHttpUrl(value: string): string {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('SERP result URL must use HTTP(S)');
    }
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase().replace(/\.$/u, '');
    url.hash = '';
    return url.toString();
  } catch {
    throw new Error(`Invalid SERP result URL: ${value}`);
  }
}

export const __focusedSerpDiscoveryTesting = {
  toSnapshot,
  toObservations,
};
