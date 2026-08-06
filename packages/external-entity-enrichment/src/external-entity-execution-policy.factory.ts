import { ConfigService } from '@nestjs/config';
import {
  ConfiguredExternalEntityRateLimiter,
  ExternalEntityProviderExecutionPolicy,
  ExternalEntityProviderRateLimitConfig,
  InMemoryExternalEntityProviderCache,
} from './external-entity-execution-policy';

export function configuredExternalEntityExecutionPolicy(
  config: Pick<ConfigService, 'get'>,
): ExternalEntityProviderExecutionPolicy {
  const cacheTtlMs = numberConfig(
    config.get<string>('EXTERNAL_ENTITY_PROVIDER_CACHE_TTL_MS'),
  );
  const rateLimitConfigs = providerRateLimitConfigs(config);

  return {
    ...(cacheTtlMs
      ? {
          cache: new InMemoryExternalEntityProviderCache(),
          cacheTtlMs,
        }
      : {}),
    ...(rateLimitConfigs.size > 0
      ? {
          rateLimiter: new ConfiguredExternalEntityRateLimiter(
            rateLimitConfigs,
          ),
        }
      : {}),
  };
}

function providerRateLimitConfigs(
  config: Pick<ConfigService, 'get'>,
): ReadonlyMap<string, ExternalEntityProviderRateLimitConfig> {
  const entries = [
    providerRateLimitConfig(
      'google_knowledge_graph',
      config.get<string>('GOOGLE_KNOWLEDGE_GRAPH_RATE_LIMIT_MAX'),
      config.get<string>('GOOGLE_KNOWLEDGE_GRAPH_RATE_LIMIT_WINDOW_MS'),
    ),
    providerRateLimitConfig(
      'wikidata',
      config.get<string>('WIKIDATA_RATE_LIMIT_MAX'),
      config.get<string>('WIKIDATA_RATE_LIMIT_WINDOW_MS'),
    ),
  ].filter((entry): entry is [string, ExternalEntityProviderRateLimitConfig] =>
    Boolean(entry),
  );

  return new Map(entries);
}

function providerRateLimitConfig(
  providerKey: string,
  maxRequestsValue: string | undefined,
  windowMsValue: string | undefined,
): [string, ExternalEntityProviderRateLimitConfig] | null {
  const maxRequests = numberConfig(maxRequestsValue);
  const windowMs = numberConfig(windowMsValue);

  if (!maxRequests || !windowMs) {
    return null;
  }

  return [providerKey, { maxRequests, windowMs }];
}

function numberConfig(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
