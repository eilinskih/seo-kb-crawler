import {
  ExternalSeoDataProvider,
  ExternalSeoEnrichmentPack,
  ExternalSeoEnrichmentRequest,
  ExternalSeoMetricSnapshot,
  ExternalSeoObservation,
  ExternalSeoProviderDescriptor,
  ExternalSeoProviderWarning,
} from './domain/external-seo-data-provider-types';
import { ExternalSeoProviderRegistry } from './external-seo-provider-registry';
import {
  ExternalSeoDataProviderRepository,
} from './persistence/external-seo-data-provider.repository';

export class ExternalSeoEnrichmentService {
  constructor(
    private readonly registry = new ExternalSeoProviderRegistry(),
    private readonly repository?: ExternalSeoDataProviderRepository,
  ) {}

  async enrich(
    request: ExternalSeoEnrichmentRequest,
  ): Promise<ExternalSeoEnrichmentPack> {
    const generatedAt = request.now ?? new Date().toISOString();
    const providers = this.registry.findProviders(request.requestedCapabilities);
    const providerStatuses: ExternalSeoProviderDescriptor[] = [];
    const warnings: ExternalSeoProviderWarning[] = [];
    const observations: ExternalSeoObservation[] = [];

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
        observations.push(...result.observations);
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

    const pack: ExternalSeoEnrichmentPack = {
      request,
      generatedAt,
      degraded: warnings.length > 0 || observations.length === 0,
      providerStatuses,
      warnings,
      observations,
      metricSnapshots: observations.flatMap((observation) =>
        observation.metrics,
      ),
    };

    await this.repository?.saveEnrichmentPack({ pack, createdAt: generatedAt });

    return pack;
  }
}

async function safeStatus(
  provider: ExternalSeoDataProvider,
): Promise<ExternalSeoProviderDescriptor> {
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
