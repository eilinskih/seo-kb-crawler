import {
  EntityExternalIdSignal,
  ExternalEntityCandidate,
  ExternalEntityEnrichmentPack,
  ExternalEntityEnrichmentRequest,
  ExternalEntityProvider,
  ExternalEntityProviderDescriptor,
  ExternalEntityProviderWarning,
} from './domain/external-entity-enrichment-types';
import { ExternalEntityProviderRegistry } from './external-entity-provider-registry';
import {
  ExternalEntityEnrichmentRepository,
} from './persistence/external-entity-enrichment.repository';

export class ExternalEntityEnrichmentService {
  constructor(
    private readonly registry = new ExternalEntityProviderRegistry(),
    private readonly repository?: ExternalEntityEnrichmentRepository,
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
        const result = await provider.enrich(request);
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
