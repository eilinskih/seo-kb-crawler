import { configuredExternalEntityProviders } from './external-entity-provider.factory';

describe('configuredExternalEntityProviders', () => {
  it('keeps providers optional when credentials are absent', async () => {
    const providers = configuredExternalEntityProviders({
      get: () => undefined,
    });

    expect(providers.map((provider) => provider.providerKey)).toEqual([
      'google_knowledge_graph',
      'wikidata',
      'local_schema_org',
    ]);
    await expect(providers[0].getStatus()).resolves.toMatchObject({
      providerKey: 'google_knowledge_graph',
      status: 'misconfigured',
    });
  });

  it('configures Google Knowledge Graph from env-backed settings', async () => {
    const providers = configuredExternalEntityProviders({
      get: (key: string) =>
        ({
          GOOGLE_KG_API_KEY: 'test-key',
          GOOGLE_KNOWLEDGE_GRAPH_LIMIT: '3',
        })[key],
    });

    await expect(providers[0].getStatus()).resolves.toMatchObject({
      providerKey: 'google_knowledge_graph',
      status: 'available',
    });
  });

  it('configures Wikidata from env-backed settings', async () => {
    const providers = configuredExternalEntityProviders({
      get: (key: string) =>
        ({
          WIKIDATA_ENABLED: 'true',
          WIKIDATA_LIMIT: '2',
        })[key],
    });

    await expect(providers[1].getStatus()).resolves.toMatchObject({
      providerKey: 'wikidata',
      status: 'available',
    });
  });
});
