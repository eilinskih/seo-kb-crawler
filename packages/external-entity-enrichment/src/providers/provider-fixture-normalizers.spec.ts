import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  GoogleKnowledgeGraphSearchResponse,
  normalizeGoogleKnowledgeGraphResponse,
} from './google-knowledge-graph.normalizer';
import {
  normalizeWikidataSearchResponse,
  WikidataSearchResponse,
  wikidataTypesFromSparqlSamples,
  wikidataUrlsFromSparqlSamples,
} from './wikidata.normalizer';

describe('External entity provider fixtures and normalizers', () => {
  it('normalizes Google Knowledge Graph responses with score-based confidence', () => {
    const fixture = fixtureJson<GoogleKnowledgeGraphFixture>(
      'google-knowledge-graph-search.fixture.json',
    );

    const taylorSwift = normalizeGoogleKnowledgeGraphResponse(
      responseFor(fixture, 'Taylor Swift'),
      request('Taylor Swift'),
    );
    const longTail = normalizeGoogleKnowledgeGraphResponse(
      responseFor(fixture, 'laser hair removal Poland'),
      request('laser hair removal Poland'),
    );
    const missing = normalizeGoogleKnowledgeGraphResponse(
      responseFor(fixture, 'zzzz long tail no entity phrase qwerty'),
      request('zzzz long tail no entity phrase qwerty'),
    );

    expect(taylorSwift[0]).toMatchObject({
      providerKey: 'google_knowledge_graph',
      externalId: 'kg:/m/0dl567',
      externalIdType: 'google_kg_id',
      name: 'Taylor Swift',
      types: ['Person', 'Thing'],
      confidence: 'high',
      urls: expect.arrayContaining([
        'http://www.taylorswift.com/',
        'https://en.wikipedia.org/wiki/Taylor_Swift',
      ]),
    });
    expect(longTail[0]).toMatchObject({
      name: 'Biogene Sp. z o.o',
      confidence: 'low',
      metadata: expect.objectContaining({
        weakCandidate: true,
      }),
    });
    expect(missing).toEqual([]);
  });

  it('normalizes Wikidata search responses without assuming first result is authoritative', () => {
    const fixture = fixtureJson<WikidataSearchFixture>(
      'wikidata-search.fixture.json',
    );

    const taylorSwift = normalizeWikidataSearchResponse(
      wikidataResponseFor(fixture, 'Taylor Swift'),
      request('Taylor Swift'),
    );
    const froggerJump = normalizeWikidataSearchResponse(
      wikidataResponseFor(fixture, 'Frogger Jump'),
      request('Frogger Jump'),
    );

    expect(taylorSwift[0]).toMatchObject({
      providerKey: 'wikidata',
      externalId: 'Q845783',
      externalIdType: 'wikidata_qid',
      name: 'Taylor Swift',
      description: '2006 studio album by Taylor Swift',
      confidence: 'medium',
      urls: expect.arrayContaining([
        'http://www.wikidata.org/entity/Q845783',
        'https://www.wikidata.org/wiki/Q845783',
      ]),
    });
    expect(froggerJump).toEqual([]);
  });

  it('extracts Wikidata SPARQL type and website samples', () => {
    const fixture = fixtureJson<WikidataSparqlFixture>(
      'wikidata-sparql-types.fixture.json',
    );
    const warsaw = fixture.responses.find((response) => response.id === 'Q270');

    expect(wikidataTypesFromSparqlSamples(warsaw?.sample ?? [])).toEqual([
      'city',
      'administrative territorial entity',
    ]);
    expect(wikidataUrlsFromSparqlSamples(warsaw?.sample ?? [])).toEqual([
      'https://um.warszawa.pl',
    ]);
  });
});

interface GoogleKnowledgeGraphFixture {
  responses: Array<{
    query: string;
    itemListElement: GoogleKnowledgeGraphSearchResponse['itemListElement'];
  }>;
}

interface WikidataSearchFixture {
  responses: Array<WikidataSearchResponse & { query: string }>;
}

interface WikidataSparqlFixture {
  responses: Array<{
    id: string;
    sample: Array<{
      label: string | null;
      typeId: string | null;
      typeLabel: string | null;
      website: string | null;
    }>;
  }>;
}

function responseFor(
  fixture: GoogleKnowledgeGraphFixture,
  query: string,
): GoogleKnowledgeGraphSearchResponse {
  const response = fixture.responses.find((item) => item.query === query);
  if (!response) {
    throw new Error(`Missing Google Knowledge Graph fixture for ${query}`);
  }

  return response;
}

function wikidataResponseFor(
  fixture: WikidataSearchFixture,
  query: string,
): WikidataSearchResponse {
  const response = fixture.responses.find((item) => item.query === query);
  if (!response) {
    throw new Error(`Missing Wikidata fixture for ${query}`);
  }

  return response;
}

function fixtureJson<T>(filename: string): T {
  return JSON.parse(
    readFileSync(join(__dirname, '__fixtures__', filename), 'utf8'),
  ) as T;
}

function request(entityName: string) {
  return {
    entityName,
    language: 'en',
    now: '2026-08-06T00:00:00.000Z',
  };
}
