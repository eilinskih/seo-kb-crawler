import {
  ExternalEntityEnrichmentRequest,
  ExternalEntityProviderKey,
  ExternalEntityProviderResult,
} from './domain/external-entity-enrichment-types';

export interface ExternalEntityProviderCacheEntry {
  providerKey: ExternalEntityProviderKey;
  cacheKey: string;
  result: ExternalEntityProviderResult;
  expiresAt: string;
  createdAt: string;
}

export interface ExternalEntityProviderCache {
  get(
    providerKey: ExternalEntityProviderKey,
    cacheKey: string,
    now: string,
  ): Promise<ExternalEntityProviderResult | null>;
  set(entry: ExternalEntityProviderCacheEntry): Promise<void>;
}

export interface ExternalEntityRateLimitDecision {
  allowed: boolean;
  resetAt?: string;
  remaining?: number;
}

export interface ExternalEntityProviderRateLimiter {
  consume(
    providerKey: ExternalEntityProviderKey,
    now: string,
  ): Promise<ExternalEntityRateLimitDecision>;
}

export interface ExternalEntityProviderExecutionPolicy {
  cache?: ExternalEntityProviderCache;
  cacheTtlMs?: number;
  rateLimiter?: ExternalEntityProviderRateLimiter;
}

export class InMemoryExternalEntityProviderCache
implements ExternalEntityProviderCache {
  private readonly records = new Map<string, ExternalEntityProviderCacheEntry>();

  async get(
    providerKey: ExternalEntityProviderKey,
    cacheKey: string,
    now: string,
  ): Promise<ExternalEntityProviderResult | null> {
    const record = this.records.get(cacheRecordKey(providerKey, cacheKey));
    if (!record) {
      return null;
    }
    if (Date.parse(record.expiresAt) <= Date.parse(now)) {
      this.records.delete(cacheRecordKey(providerKey, cacheKey));
      return null;
    }
    return record.result;
  }

  async set(entry: ExternalEntityProviderCacheEntry): Promise<void> {
    this.records.set(cacheRecordKey(entry.providerKey, entry.cacheKey), entry);
  }
}

export class FixedWindowExternalEntityRateLimiter
implements ExternalEntityProviderRateLimiter {
  private readonly windows = new Map<string, { startsAt: number; count: number }>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
  ) {
    if (!Number.isInteger(maxRequests) || maxRequests < 1) {
      throw new Error('maxRequests must be a positive integer');
    }
    if (!Number.isInteger(windowMs) || windowMs < 1) {
      throw new Error('windowMs must be a positive integer');
    }
  }

  async consume(
    providerKey: ExternalEntityProviderKey,
    now: string,
  ): Promise<ExternalEntityRateLimitDecision> {
    const nowMs = Date.parse(now);
    const window = this.windows.get(providerKey);
    if (!window || nowMs - window.startsAt >= this.windowMs) {
      this.windows.set(providerKey, { startsAt: nowMs, count: 1 });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: new Date(nowMs + this.windowMs).toISOString(),
      };
    }

    if (window.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(window.startsAt + this.windowMs).toISOString(),
      };
    }

    window.count += 1;
    return {
      allowed: true,
      remaining: this.maxRequests - window.count,
      resetAt: new Date(window.startsAt + this.windowMs).toISOString(),
    };
  }
}

export function externalEntityCacheKey(
  providerKey: ExternalEntityProviderKey,
  request: ExternalEntityEnrichmentRequest,
): string {
  return stableStringify({
    providerKey,
    entityId: request.entityId ?? null,
    entityName: request.entityName,
    entityType: request.entityType ?? null,
    vertical: request.vertical ?? null,
    language: request.language ?? null,
    geo: request.geo ?? null,
    requestedCapabilities: request.requestedCapabilities ?? [],
    schemaOrgSignals: request.schemaOrgSignals ?? [],
  });
}

export function cacheExpiry(now: string, ttlMs: number): string {
  return new Date(Date.parse(now) + ttlMs).toISOString();
}

function cacheRecordKey(
  providerKey: ExternalEntityProviderKey,
  cacheKey: string,
): string {
  return `${providerKey}:${cacheKey}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entryValue]) =>
      `${JSON.stringify(key)}:${stableStringify(entryValue)}`,
    ).join(',')}}`;
  }
  return JSON.stringify(value);
}
