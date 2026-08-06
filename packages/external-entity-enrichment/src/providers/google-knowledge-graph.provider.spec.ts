import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ExternalEntityEnrichmentService } from '../external-entity-enrichment.service';
import { ExternalEntityProviderRegistry } from '../external-entity-provider-registry';
import { GoogleKnowledgeGraphSearchResponse } from './google-knowledge-graph.normalizer';
import { GoogleKnowledgeGraphProvider } from './google-knowledge-graph.provider';
import { LocalSchemaOrgEntityProvider } from './local-schema-org-entity.provider';

describe('GoogleKnowledgeGraphProvider', () => {
  it('reports misconfigured status when the API key is absent', async () => {
    const provider = new GoogleKnowledgeGraphProvider();

    await expect(provider.getStatus()).resolves.toMatchObject({
      providerKey: 'google_knowledge_graph',
      status: 'misconfigured',
      warnings: [
        expect.objectContaining({
          code: 'missing_api_key',
        }),
      ],
    });
    await expect(provider.enrich({ entityName: 'Taylor Swift' })).resolves.toEqual({
      candidates: [],
      warnings: [
        expect.objectContaining({
          code: 'missing_api_key',
        }),
      ],
    });
  });

  it('calls Google Knowledge Graph and normalizes candidates', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => fixtureResponse('Taylor Swift'),
      text: async () => '',
    }));
    const provider = new GoogleKnowledgeGraphProvider({
      apiKey: 'test-key',
      endpoint: 'https://example.test/entities:search',
      limit: 3,
      fetchImpl,
    });

    const result = await provider.enrich({
      entityName: 'Taylor Swift',
      language: 'en',
      now: '2026-08-06T00:00:00.000Z',
    });

    const calls = fetchImpl.mock.calls as unknown as Array<[string]>;
    const calledUrl = new URL(calls[0][0]);
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      'https://example.test/entities:search',
    );
    expect(calledUrl.searchParams.get('query')).toBe('Taylor Swift');
    expect(calledUrl.searchParams.get('limit')).toBe('3');
    expect(calledUrl.searchParams.get('languages')).toBe('en');
    expect(calledUrl.searchParams.get('key')).toBe('test-key');
    expect(result.candidates[0]).toMatchObject({
      providerKey: 'google_knowledge_graph',
      externalId: 'kg:/m/0dl567',
      name: 'Taylor Swift',
      confidence: 'high',
    });
  });

  it('throws provider transport errors so enrichment service can fail open', async () => {
    const provider = new GoogleKnowledgeGraphProvider({
      apiKey: 'test-key',
      fetchImpl: async () => ({
        ok: false,
        status: 429,
        json: async () => ({}),
        text: async () => 'rate limited',
      }),
    });

    await expect(provider.enrich({ entityName: 'Taylor Swift' })).rejects.toThrow(
      'Google Knowledge Graph API returned HTTP 429: rate limited',
    );
  });

  it('lets the enrichment service fail open around Google provider errors', async () => {
    const service = new ExternalEntityEnrichmentService(
      new ExternalEntityProviderRegistry([
        new GoogleKnowledgeGraphProvider({
          apiKey: 'test-key',
          fetchImpl: async () => ({
            ok: false,
            status: 500,
            json: async () => ({}),
            text: async () => 'server error',
          }),
        }),
        new LocalSchemaOrgEntityProvider(),
      ]),
    );

    const pack = await service.enrich({
      entityName: 'Taylor Swift',
      schemaOrgSignals: [{
        type: 'Person',
        name: 'Taylor Swift',
        sameAs: ['https://www.wikidata.org/wiki/Q26876'],
      }],
      now: '2026-08-06T00:00:00.000Z',
    });

    expect(pack.degraded).toBe(true);
    expect(pack.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        providerKey: 'google_knowledge_graph',
        code: 'provider_error',
      }),
    ]));
    expect(pack.candidates.some((candidate) =>
      candidate.providerKey === 'local_schema_org',
    )).toBe(true);
  });
});

interface GoogleKnowledgeGraphFixture {
  responses: Array<{
    query: string;
    itemListElement: GoogleKnowledgeGraphSearchResponse['itemListElement'];
  }>;
}

function fixtureResponse(query: string): GoogleKnowledgeGraphSearchResponse {
  const fixture = JSON.parse(
    readFileSync(
      join(
        __dirname,
        '__fixtures__',
        'google-knowledge-graph-search.fixture.json',
      ),
      'utf8',
    ),
  ) as GoogleKnowledgeGraphFixture;
  const response = fixture.responses.find((item) => item.query === query);
  if (!response) {
    throw new Error(`Missing Google Knowledge Graph fixture for ${query}`);
  }

  return response;
}
