import {
  ExternalSeoDataProvider,
  ExternalSeoEnrichmentRequest,
  ExternalSeoProviderDescriptor,
  ExternalSeoProviderResult,
} from './domain/external-seo-data-provider-types';
import { ExternalSeoEnrichmentService } from './external-seo-enrichment.service';
import { ExternalSeoProviderRegistry } from './external-seo-provider-registry';
import { FallbackSeoSignalsProvider } from './fallback-seo-signals.provider';
import { InMemoryExternalSeoDataProviderRepository } from './testing/in-memory-external-seo-data-provider.repository';

describe('ExternalSeoEnrichmentService', () => {
  const request: ExternalSeoEnrichmentRequest = {
    topicId: 'topic-1',
    topicSeed: 'laser hair removal',
    query: 'laser hair removal',
    candidateKeywords: ['laser hair removal cost'],
    language: 'en',
    market: { countryCode: 'PL' },
    now: '2026-07-23T00:00:00.000Z',
  };

  it('returns fallback observations with nullable metrics', async () => {
    const service = new ExternalSeoEnrichmentService();

    const pack = await service.enrich(request);

    expect(pack.degraded).toBe(true);
    expect(pack.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'fallback_only' }),
    ]));
    expect(pack.observations).toHaveLength(2);
    expect(pack.metricSnapshots).toEqual(expect.arrayContaining([
      expect.objectContaining({
        metricName: 'traffic_potential',
        value: null,
        providerKey: 'fallback_seo_signals',
      }),
    ]));
  });

  it('fails open when a provider throws during enrichment', async () => {
    const provider = new ThrowingProvider();
    const service = new ExternalSeoEnrichmentService(
      new ExternalSeoProviderRegistry([
        provider,
        new FallbackSeoSignalsProvider(),
      ]),
    );

    const pack = await service.enrich(request);

    expect(pack.degraded).toBe(true);
    expect(pack.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        providerKey: 'throwing_provider',
        code: 'provider_error',
      }),
    ]));
    expect(pack.observations.some((observation) =>
      observation.providerKey === 'fallback_seo_signals',
    )).toBe(true);
  });

  it('does not call disabled or misconfigured providers', async () => {
    const provider = new DisabledProvider();
    const service = new ExternalSeoEnrichmentService(
      new ExternalSeoProviderRegistry([provider]),
    );

    const pack = await service.enrich(request);

    expect(provider.enrichCalled).toBe(false);
    expect(pack.degraded).toBe(true);
    expect(pack.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        providerKey: 'disabled_provider',
        code: 'provider_disabled',
      }),
    ]));
  });

  it('can persist enrichment packs through the repository boundary', async () => {
    const repository = new InMemoryExternalSeoDataProviderRepository();
    const service = new ExternalSeoEnrichmentService(
      new ExternalSeoProviderRegistry(),
      repository,
    );

    await service.enrich(request);

    await expect(repository.findLatestEnrichmentPack(
      'topic-1',
      'laser hair removal',
    )).resolves.toEqual(expect.objectContaining({
      id: 'external-seo-pack-1',
      request: expect.objectContaining({ topicId: 'topic-1' }),
    }));
  });
});

class ThrowingProvider implements ExternalSeoDataProvider {
  readonly providerKey = 'throwing_provider';
  readonly tier = 'paid_provider' as const;
  readonly capabilities = ['search_volume'] as const;

  async getStatus(): Promise<ExternalSeoProviderDescriptor> {
    return {
      providerKey: this.providerKey,
      tier: this.tier,
      capabilities: [...this.capabilities],
      status: 'available' as const,
    };
  }

  async enrich(): Promise<ExternalSeoProviderResult> {
    throw new Error('api unavailable');
  }
}

class DisabledProvider implements ExternalSeoDataProvider {
  readonly providerKey = 'disabled_provider';
  readonly tier = 'paid_provider' as const;
  readonly capabilities = ['search_volume'] as const;
  enrichCalled = false;

  async getStatus(): Promise<ExternalSeoProviderDescriptor> {
    return {
      providerKey: this.providerKey,
      tier: this.tier,
      capabilities: [...this.capabilities],
      status: 'disabled' as const,
    };
  }

  async enrich(): Promise<ExternalSeoProviderResult> {
    this.enrichCalled = true;
    return {
      observations: [],
    };
  }
}
