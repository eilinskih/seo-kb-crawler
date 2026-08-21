import {
  EntityExternalIdSignal,
  ExternalEntityCandidate,
  ExternalEntityEnrichmentPack,
  ExternalEntityEnrichmentRequest,
  ExternalEntityProvider,
  ExternalEntityProviderDescriptor,
  ExternalEntityProviderResult,
  ExternalEntityProviderWarning,
} from './domain/external-entity-enrichment-types';
import { ExternalEntityProviderRegistry } from './external-entity-provider-registry';
import {
  ExternalEntityEnrichmentRepository,
} from './persistence/external-entity-enrichment.repository';
import {
  cacheExpiry,
  externalEntityCacheKey,
  ExternalEntityProviderExecutionPolicy,
} from './external-entity-execution-policy';

export class ExternalEntityEnrichmentService {
  constructor(
    private readonly registry = new ExternalEntityProviderRegistry(),
    private readonly repository?: ExternalEntityEnrichmentRepository,
    private readonly executionPolicy: ExternalEntityProviderExecutionPolicy = {},
  ) {}

  async enrich(
    request: ExternalEntityEnrichmentRequest,
  ): Promise<ExternalEntityEnrichmentPack> {
    const generatedAt = request.now ?? new Date().toISOString();
    const providers = this.registry.findProviders(request.requestedCapabilities);
    const providerStatuses: ExternalEntityProviderDescriptor[] = [];
    const warnings: ExternalEntityProviderWarning[] = [];
    const candidates: ExternalEntityCandidate[] = [];

    for (const provider of providers) {
      const status = await safeStatus(provider);
      providerStatuses.push(status);
      warnings.push(...(status.warnings ?? []));

      if (status.status === 'disabled' || status.status === 'misconfigured') {
        warnings.push({
          providerKey: provider.providerKey,
          status: status.status,
          code: `provider_${status.status}`,
          message: `${provider.providerKey} is ${status.status}.`,
        });
        continue;
      }

      try {
        const cacheKey = externalEntityCacheKey(provider.providerKey, request);
        const cached = await this.executionPolicy.cache?.get(
          provider.providerKey,
          cacheKey,
          generatedAt,
        );
        if (cached) {
          candidates.push(...cached.candidates);
          warnings.push(...(cached.warnings ?? []));
          continue;
        }

        const result = this.executionPolicy.queue && provider.tier !== 'local_signal'
          ? await this.executionPolicy.queue.execute(
              provider.providerKey,
              () => provider.enrich(request),
            )
          : await this.enrichWithRateLimiter(provider, request, generatedAt);
        if (this.executionPolicy.cache && this.executionPolicy.cacheTtlMs) {
          await this.executionPolicy.cache.set({
            providerKey: provider.providerKey,
            cacheKey,
            result,
            createdAt: generatedAt,
            expiresAt: cacheExpiry(generatedAt, this.executionPolicy.cacheTtlMs),
          });
        }
        candidates.push(...result.candidates);
        warnings.push(...(result.warnings ?? []));
      } catch (error) {
        warnings.push({
          providerKey: provider.providerKey,
          status: 'unavailable',
          code: 'provider_error',
          message: errorMessage(error),
        });
      }
    }

    const pack: ExternalEntityEnrichmentPack = {
      request,
      generatedAt,
      degraded: warnings.length > 0 || candidates.length === 0,
      providerStatuses,
      warnings,
      candidates,
      externalIds: externalIdsFromCandidates(candidates),
    };

    await this.repository?.saveEnrichmentPack({ pack, createdAt: generatedAt });

    return pack;
  }

  private async enrichWithRateLimiter(
    provider: ExternalEntityProvider,
    request: ExternalEntityEnrichmentRequest,
    generatedAt: string,
  ): Promise<ExternalEntityProviderResult> {
    const rateLimitDecision = provider.tier === 'local_signal'
      ? undefined
      : await this.executionPolicy.rateLimiter?.consume(
          provider.providerKey,
          generatedAt,
        );
    if (rateLimitDecision && !rateLimitDecision.allowed) {
      return {
        candidates: [],
        warnings: [{
          providerKey: provider.providerKey,
          status: 'rate_limited',
          code: 'provider_rate_limited',
          message: rateLimitDecision.resetAt
            ? `${provider.providerKey} is rate-limited until ${rateLimitDecision.resetAt}.`
            : `${provider.providerKey} is rate-limited.`,
        }],
      };
    }

    return provider.enrich(request);
  }
}

function externalIdsFromCandidates(
  candidates: ExternalEntityCandidate[],
): EntityExternalIdSignal[] {
  return candidates
    .filter((candidate) => candidate.externalId && candidate.externalIdType)
    .map((candidate) => ({
      providerKey: candidate.providerKey,
      externalId: candidate.externalId as string,
      externalIdType: candidate.externalIdType as string,
      confidence: candidate.confidence,
      sourceUrl: candidate.provenance.sourceUrl ?? null,
      observedAt: candidate.provenance.observedAt,
    }));
}

async function safeStatus(
  provider: ExternalEntityProvider,
): Promise<ExternalEntityProviderDescriptor> {
  try {
    return await provider.getStatus();
  } catch (error) {
    return {
      providerKey: provider.providerKey,
      tier: provider.tier,
      capabilities: provider.capabilities,
      status: 'unavailable',
      warnings: [{
        providerKey: provider.providerKey,
        status: 'unavailable',
        code: 'provider_status_error',
        message: errorMessage(error),
      }],
    };
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
