import { configuredExternalEntityExecutionPolicy } from './external-entity-execution-policy.factory';

describe('configuredExternalEntityExecutionPolicy', () => {
  it('keeps execution policy empty by default', () => {
    const policy = configuredExternalEntityExecutionPolicy({
      get: () => undefined,
    });

    expect(policy.cache).toBeUndefined();
    expect(policy.cacheTtlMs).toBeUndefined();
    expect(policy.rateLimiter).toBeUndefined();
  });

  it('configures an explicit in-memory cache TTL', () => {
    const policy = configuredExternalEntityExecutionPolicy({
      get: (key: string) =>
        ({
          EXTERNAL_ENTITY_PROVIDER_CACHE_TTL_MS: '60000',
        })[key],
    });

    expect(policy.cache).toBeDefined();
    expect(policy.cacheTtlMs).toBe(60_000);
  });

  it('configures provider-specific rate limits', async () => {
    const policy = configuredExternalEntityExecutionPolicy({
      get: (key: string) =>
        ({
          GOOGLE_KNOWLEDGE_GRAPH_RATE_LIMIT_MAX: '1',
          GOOGLE_KNOWLEDGE_GRAPH_RATE_LIMIT_WINDOW_MS: '60000',
          WIKIDATA_RATE_LIMIT_MAX: '2',
          WIKIDATA_RATE_LIMIT_WINDOW_MS: '60000',
        })[key],
    });

    await expect(
      policy.rateLimiter?.consume(
        'google_knowledge_graph',
        '2026-08-06T00:00:00.000Z',
      ),
    ).resolves.toMatchObject({
      allowed: true,
      remaining: 0,
    });
    await expect(
      policy.rateLimiter?.consume(
        'google_knowledge_graph',
        '2026-08-06T00:00:30.000Z',
      ),
    ).resolves.toMatchObject({
      allowed: false,
      remaining: 0,
    });
    await expect(
      policy.rateLimiter?.consume('wikidata', '2026-08-06T00:00:30.000Z'),
    ).resolves.toMatchObject({
      allowed: true,
      remaining: 1,
    });
    await expect(
      policy.rateLimiter?.consume(
        'local_schema_org',
        '2026-08-06T00:00:30.000Z',
      ),
    ).resolves.toMatchObject({
      allowed: true,
    });
  });
});
