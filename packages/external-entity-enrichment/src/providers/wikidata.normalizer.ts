import {
  ExternalEntityCandidate,
  ExternalEntityEnrichmentRequest,
} from '../domain/external-entity-enrichment-types';

export interface WikidataSearchResponse {
  searchinfo?: {
    search?: string;
  };
  search?: WikidataSearchResult[];
}

interface WikidataSearchResult {
  id?: string;
  title?: string;
  label?: string;
  description?: string;
  aliases?: string[];
  concepturi?: string;
  url?: string;
}

export interface WikidataSparqlTypeSample {
  label: string | null;
  typeId: string | null;
  typeLabel: string | null;
  website: string | null;
}

export function normalizeWikidataSearchResponse(
  response: WikidataSearchResponse,
  request: ExternalEntityEnrichmentRequest,
): ExternalEntityCandidate[] {
  const observedAt = request.now ?? null;
  const ambiguous = (response.search?.length ?? 0) > 1;

  return (response.search ?? [])
    .filter((item) => Boolean(item.id && item.label))
    .map((item, index) => ({
      providerKey: 'wikidata',
      source: 'wikidata',
      externalId: item.id as string,
      externalIdType: 'wikidata_qid',
      name: item.label as string,
      description: item.description ?? null,
      types: [],
      aliases: item.aliases ?? [],
      urls: urlsFrom(item.concepturi, wikidataUrl(item.url)),
      score: null,
      confidence: index === 0 && !ambiguous ? 'medium' : 'low',
      language: request.language,
      metadata: {
        search: response.searchinfo?.search ?? request.entityName,
        rank: index + 1,
        ambiguous,
      },
      provenance: {
        providerKey: 'wikidata',
        source: 'wikidata',
        sourceUrl: item.concepturi ?? wikidataUrl(item.url) ?? null,
        sourceDocumentId: null,
        observedAt,
      },
    }));
}

export function wikidataTypesFromSparqlSamples(
  samples: WikidataSparqlTypeSample[],
): string[] {
  return [
    ...new Set(samples.map((sample) => sample.typeLabel).filter(isString)),
  ];
}

export function wikidataUrlsFromSparqlSamples(
  samples: WikidataSparqlTypeSample[],
): string[] {
  return [...new Set(samples.map((sample) => sample.website).filter(isString))];
}

function wikidataUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.startsWith('//') ? `https:${value}` : value;
}

function urlsFrom(...urls: Array<string | null | undefined>): string[] {
  return [...new Set(urls.filter(isString))];
}

function isString(value: string | null | undefined): value is string {
  return Boolean(value);
}
