import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ExternalEntityEnrichmentService } from '../external-entity-enrichment.service';
import { ExternalEntityProviderRegistry } from '../external-entity-provider-registry';
import { WikidataSearchResponse } from './wikidata.normalizer';
import { WikidataEntityProvider } from './wikidata-entity.provider';

describe('WikidataEntityProvider', () => {
  it('is disabled by default and does not block enrichment', async () => {
    const provider = new WikidataEntityProvider();

    await expect(provider.getStatus()).resolves.toMatchObject({
      providerKey: 'wikidata',
      status: 'disabled',
      warnings: [
        expect.objectContaining({
          code: 'provider_disabled_by_default',
        }),
      ],
    });
    await expect(provider.enrich({ entityName: 'Warsaw' })).resolves.toEqual({
      candidates: [],
      warnings: [
        expect.objectContaining({
          code: 'provider_disabled_by_default',
        }),
      ],
    });
  });

  it('calls Wikidata Search and SPARQL and enriches candidates', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => wikidataSearchFixture('Warsaw'),
        text: async () => '',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => wikidataSparqlResponse(),
        text: async () => '',
      });
    const provider = new WikidataEntityProvider({
      enabled: true,
      searchEndpoint: 'https://example.test/w/api.php',
      sparqlEndpoint: 'https://example.test/sparql',
      limit: 3,
      fetchImpl,
    });

    const result = await provider.enrich({
      entityName: 'Warsaw',
      language: 'en',
      now: '2026-08-06T00:00:00.000Z',
    });

    const calls = fetchImpl.mock.calls as unknown as Array<[string]>;
    const searchUrl = new URL(calls[0][0]);
    const sparqlUrl = new URL(calls[1][0]);

    expect(searchUrl.origin + searchUrl.pathname).toBe(
      'https://example.test/w/api.php',
    );
    expect(searchUrl.searchParams.get('action')).toBe('wbsearchentities');
    expect(searchUrl.searchParams.get('search')).toBe('Warsaw');
    expect(searchUrl.searchParams.get('language')).toBe('en');
    expect(searchUrl.searchParams.get('limit')).toBe('3');
    expect(sparqlUrl.origin + sparqlUrl.pathname).toBe(
      'https://example.test/sparql',
    );
    expect(sparqlUrl.searchParams.get('query')).toContain('wd:Q270');
    expect(result.candidates[0]).toMatchObject({
      providerKey: 'wikidata',
      externalId: 'Q270',
      name: 'Warsaw',
      types: ['city', 'administrative territorial entity'],
      urls: expect.arrayContaining([
        'http://www.wikidata.org/entity/Q270',
        'https://www.wikidata.org/wiki/Q270',
        'https://um.warszawa.pl',
      ]),
      metadata: expect.objectContaining({
        sparqlTypeCount: 2,
        sparqlWebsiteCount: 1,
      }),
    });
  });

  it('keeps search candidates when SPARQL enrichment degrades', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => wikidataSearchFixture('Warsaw'),
        text: async () => '',
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({}),
        text: async () => 'rate limited',
      });
    const provider = new WikidataEntityProvider({
      enabled: true,
      fetchImpl,
    });

    const result = await provider.enrich({ entityName: 'Warsaw' });

    expect(result.candidates[0]).toMatchObject({
      providerKey: 'wikidata',
      externalId: 'Q270',
      name: 'Warsaw',
      types: [],
    });
    expect(result.warnings).toEqual([
      expect.objectContaining({
        providerKey: 'wikidata',
        code: 'sparql_enrichment_error',
      }),
    ]);
  });

  it('lets the enrichment service fail open around Wikidata search errors', async () => {
    const service = new ExternalEntityEnrichmentService(
      new ExternalEntityProviderRegistry([
        new WikidataEntityProvider({
          enabled: true,
          fetchImpl: async () => ({
            ok: false,
            status: 500,
            json: async () => ({}),
            text: async () => 'server error',
          }),
        }),
      ]),
    );

    const pack = await service.enrich({
      entityName: 'Warsaw',
      now: '2026-08-06T00:00:00.000Z',
    });

    expect(pack.degraded).toBe(true);
    expect(pack.candidates).toEqual([]);
    expect(pack.warnings).toEqual([
      expect.objectContaining({
        providerKey: 'wikidata',
        code: 'provider_error',
      }),
    ]);
  });
});

interface WikidataSearchFixture {
  responses: Array<WikidataSearchResponse & { query: string }>;
}

function wikidataSearchFixture(query: string): WikidataSearchResponse {
  const fixture = JSON.parse(
    readFileSync(
      join(__dirname, '__fixtures__', 'wikidata-search.fixture.json'),
      'utf8',
    ),
  ) as WikidataSearchFixture;
  const response = fixture.responses.find((item) => item.query === query);
  if (!response) {
    throw new Error(`Missing Wikidata fixture for ${query}`);
  }

  return response;
}

function wikidataSparqlResponse() {
  return {
    results: {
      bindings: [
        sparqlBinding('Q270', 'Warsaw', 'Q515', 'city', 'https://um.warszawa.pl'),
        sparqlBinding(
          'Q270',
          'Warsaw',
          'Q56061',
          'administrative territorial entity',
          'https://um.warszawa.pl',
        ),
      ],
    },
  };
}

function sparqlBinding(
  entityId: string,
  entityLabel: string,
  typeId: string,
  typeLabel: string,
  website: string,
) {
  return {
    entity: { value: `http://www.wikidata.org/entity/${entityId}` },
    entityLabel: { value: entityLabel },
    type: { value: `http://www.wikidata.org/entity/${typeId}` },
    typeLabel: { value: typeLabel },
    website: { value: website },
  };
}
