import {
  ExternalEntityProvider,
  ExternalEntityProviderDescriptor,
  ExternalEntityProviderResult,
} from './domain/external-entity-enrichment-types';
import { ExternalEntityEnrichmentService } from './external-entity-enrichment.service';
import { ExternalEntityProviderRegistry } from './external-entity-provider-registry';
import { LocalSchemaOrgEntityProvider } from './providers/local-schema-org-entity.provider';
import { InMemoryExternalEntityEnrichmentRepository } from './testing/in-memory-external-entity-enrichment.repository';

describe('ExternalEntityEnrichmentService', () => {
  const request = {
    entityId: 'entity-1',
    entityName: 'Frogger Jump',
    entityType: 'game',
    language: 'en',
    now: '2026-07-26T00:00:00.000Z',
    schemaOrgSignals: [{
      sourceDocumentId: 'document-1',
      sourceUrl: 'https://example.com/frogger-jump',
      type: 'VideoGame',
      name: 'Frogger Jump',
      alternateNames: ['Frogger Jump Game', 'Frogger-Spiel'],
      sameAs: ['https://www.wikidata.org/wiki/Q123'],
      description: 'Arcade-style crossing game.',
      language: 'en',
    }],
  };

  it('normalizes local Schema.org signals into enrichment candidates', async () => {
    const service = new ExternalEntityEnrichmentService(
      new ExternalEntityProviderRegistry([new LocalSchemaOrgEntityProvider()]),
    );

    const pack = await service.enrich(request);

    expect(pack.degraded).toBe(false);
    expect(pack.candidates).toEqual([expect.objectContaining({
      providerKey: 'local_schema_org',
      source: 'schema_org',
      externalId: 'https://www.wikidata.org/wiki/Q123',
      externalIdType: 'same_as_url',
      name: 'Frogger Jump',
      types: ['VideoGame'],
      aliases: ['Frogger Jump Game', 'Frogger-Spiel'],
      confidence: 'medium',
    })]);
    expect(pack.externalIds).toEqual([expect.objectContaining({
      providerKey: 'local_schema_org',
      externalId: 'https://www.wikidata.org/wiki/Q123',
      externalIdType: 'same_as_url',
    })]);
  });

  it('fails open when external providers are misconfigured', async () => {
    const service = new ExternalEntityEnrichmentService();

    const pack = await service.enrich({
      entityName: 'Frogger Jump',
      now: '2026-07-26T00:00:00.000Z',
    });

    expect(pack.degraded).toBe(true);
    expect(pack.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        providerKey: 'google_knowledge_graph',
        code: 'missing_api_key',
      }),
      expect.objectContaining({
        providerKey: 'wikidata',
        code: 'provider_disabled_by_default',
      }),
      expect.objectContaining({
        providerKey: 'local_schema_org',
        code: 'no_schema_org_signals',
      }),
    ]));
  });

  it('fails open when a provider throws during enrichment', async () => {
    const service = new ExternalEntityEnrichmentService(
      new ExternalEntityProviderRegistry([
        new ThrowingProvider(),
        new LocalSchemaOrgEntityProvider(),
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
    expect(pack.candidates.some((candidate) =>
      candidate.providerKey === 'local_schema_org',
    )).toBe(true);
  });

  it('can persist enrichment packs through the repository boundary', async () => {
    const repository = new InMemoryExternalEntityEnrichmentRepository();
    const service = new ExternalEntityEnrichmentService(
      new ExternalEntityProviderRegistry([new LocalSchemaOrgEntityProvider()]),
      repository,
    );

    await service.enrich(request);

    await expect(repository.findLatestEnrichmentPack('Frogger Jump'))
      .resolves.toEqual(expect.objectContaining({
        id: 'external-entity-pack-1',
        request: expect.objectContaining({ entityId: 'entity-1' }),
      }));
  });
});

class ThrowingProvider implements ExternalEntityProvider {
  readonly providerKey = 'throwing_provider';
  readonly tier = 'public_provider' as const;
  readonly capabilities = ['entity_lookup'] as const;

  async getStatus(): Promise<ExternalEntityProviderDescriptor> {
    return {
      providerKey: this.providerKey,
      tier: this.tier,
      capabilities: [...this.capabilities],
      status: 'available',
    };
  }

  async enrich(): Promise<ExternalEntityProviderResult> {
    throw new Error('entity provider unavailable');
  }
}
