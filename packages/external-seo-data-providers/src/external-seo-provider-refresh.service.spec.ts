import {
  ExternalSeoDataProvider,
  ExternalSeoProviderDescriptor,
  ExternalSeoProviderResult,
} from './domain/external-seo-data-provider-types';
import { ExternalSeoEnrichmentService } from './external-seo-enrichment.service';
import { ExternalSeoProviderRefreshService } from './external-seo-provider-refresh.service';
import { ExternalSeoProviderRegistry } from './external-seo-provider-registry';
import { FallbackSeoSignalsProvider } from './fallback-seo-signals.provider';
import { InMemoryExternalSeoDataProviderRepository } from './testing/in-memory-external-seo-data-provider.repository';

describe('ExternalSeoProviderRefreshService', () => {
  it('runs scheduled refresh through enrichment and persists provider-neutral packs', async () => {
    const repository = new InMemoryExternalSeoDataProviderRepository();
    const service = new ExternalSeoProviderRefreshService(
      new ExternalSeoEnrichmentService(
        new ExternalSeoProviderRegistry([new FallbackSeoSignalsProvider()]),
        repository,
      ),
    );

    const result = await service.refresh({
      trigger: 'scheduled_provider_refresh',
      topicId: 'topic-1',
      topicSeed: 'laser hair removal',
      query: 'laser hair removal',
      candidateKeywords: ['laser hair removal cost'],
      scheduledAt: '2026-08-05T00:00:00.000Z',
    });

    expect(result).toMatchObject({
      trigger: 'scheduled_provider_refresh',
      status: 'degraded',
      refreshedAt: '2026-08-05T00:00:00.000Z',
      pack: expect.objectContaining({
        generatedAt: '2026-08-05T00:00:00.000Z',
      }),
    });
    await expect(
      repository.findLatestEnrichmentPack('topic-1', 'laser hair removal'),
    ).resolves.toEqual(expect.objectContaining({
      id: 'external-seo-pack-1',
      observations: expect.any(Array),
    }));
  });

  it('keeps scheduled refresh fail-open when an optional provider fails', async () => {
    const service = new ExternalSeoProviderRefreshService(
      new ExternalSeoEnrichmentService(
        new ExternalSeoProviderRegistry([
          new ThrowingProvider(),
          new FallbackSeoSignalsProvider(),
        ]),
      ),
    );

    const result = await service.refresh({
      trigger: 'scheduled_provider_refresh',
      topicId: 'topic-1',
      query: 'laser hair removal',
      scheduledAt: '2026-08-05T00:00:00.000Z',
    });

    expect(result.status).toBe('degraded');
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        providerKey: 'throwing_provider',
        code: 'provider_error',
      }),
    ]));
    expect(result.pack.observations.some((observation) =>
      observation.providerKey === 'fallback_seo_signals',
    )).toBe(true);
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
      status: 'available',
    };
  }

  async enrich(): Promise<ExternalSeoProviderResult> {
    throw new Error('provider unavailable');
  }
}
