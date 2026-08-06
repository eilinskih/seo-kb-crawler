import {
  ExternalEntityEnrichmentRequest,
  ExternalEntityProvider,
  ExternalEntityProviderDescriptor,
  ExternalEntityProviderResult,
} from '../domain/external-entity-enrichment-types';
import {
  enrichWikidataCandidateWithSparqlSamples,
  normalizeWikidataSearchResponse,
  WikidataSearchResponse,
  WikidataSparqlTypeSample,
} from './wikidata.normalizer';

export interface WikidataEntityProviderOptions {
  enabled?: boolean;
  searchEndpoint?: string;
  sparqlEndpoint?: string;
  limit?: number;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}

interface FetchLikeResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

type FetchLike = (
  url: string,
  init?: {
    headers?: Record<string, string>;
    signal?: AbortSignal;
  },
) => Promise<FetchLikeResponse>;

interface WikidataSparqlResponse {
  results?: {
    bindings?: WikidataSparqlBinding[];
  };
}

interface WikidataSparqlBinding {
  entity?: { value?: string };
  entityLabel?: { value?: string };
  type?: { value?: string };
  typeLabel?: { value?: string };
  website?: { value?: string };
}

export class WikidataEntityProvider implements ExternalEntityProvider {
  readonly providerKey = 'wikidata';
  readonly tier = 'public_provider' as const;
  readonly capabilities = [
    'entity_lookup',
    'external_ids',
    'aliases',
    'multilingual_aliases',
    'entity_types',
    'sitelinks',
  ] as const;

  private readonly searchEndpoint: string;
  private readonly sparqlEndpoint: string;
  private readonly limit: number;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(private readonly options: WikidataEntityProviderOptions = {}) {
    this.searchEndpoint =
      options.searchEndpoint ?? 'https://www.wikidata.org/w/api.php';
    this.sparqlEndpoint =
      options.sparqlEndpoint ?? 'https://query.wikidata.org/sparql';
    this.limit = options.limit ?? 5;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getStatus(): Promise<ExternalEntityProviderDescriptor> {
    if (!this.options.enabled) {
      return {
        providerKey: this.providerKey,
        tier: this.tier,
        capabilities: [...this.capabilities],
        status: 'disabled',
        warnings: [{
          providerKey: this.providerKey,
          status: 'disabled',
          code: 'provider_disabled_by_default',
          message: 'Wikidata enrichment is disabled until scheduled provider execution is configured.',
        }],
      };
    }

    return {
      providerKey: this.providerKey,
      tier: this.tier,
      capabilities: [...this.capabilities],
      status: 'available',
    };
  }

  async enrich(
    request: ExternalEntityEnrichmentRequest,
  ): Promise<ExternalEntityProviderResult> {
    const status = await this.getStatus();
    if (status.status !== 'available') {
      return {
        candidates: [],
        warnings: status.warnings,
      };
    }

    const searchResponse = await this.search(request);
    const candidates = normalizeWikidataSearchResponse(searchResponse, request);
    const ids = candidates
      .map((candidate) => candidate.externalId)
      .filter((id): id is string => Boolean(id));

    if (ids.length === 0) {
      return { candidates };
    }

    try {
      const samplesById = await this.sparqlSamples(ids);

      return {
        candidates: candidates.map((candidate) =>
          enrichWikidataCandidateWithSparqlSamples(
            candidate,
            samplesById.get(candidate.externalId ?? '') ?? [],
          ),
        ),
      };
    } catch (error) {
      return {
        candidates,
        warnings: [{
          providerKey: this.providerKey,
          status: 'degraded',
          code: 'sparql_enrichment_error',
          message: errorMessage(error),
        }],
      };
    }
  }

  private async search(
    request: ExternalEntityEnrichmentRequest,
  ): Promise<WikidataSearchResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const url = new URL(this.searchEndpoint);
    url.searchParams.set('action', 'wbsearchentities');
    url.searchParams.set('search', request.entityName);
    url.searchParams.set('language', request.language ?? 'en');
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', String(this.limit));
    url.searchParams.set('origin', '*');

    try {
      const response = await this.fetchImpl(url.toString(), {
        headers: {
          'User-Agent': 'seo-kb-crawler/0.1 external-entity-enrichment',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Wikidata Search API returned HTTP ${response.status}: ${await response.text()}`,
        );
      }

      return response.json() as Promise<WikidataSearchResponse>;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async sparqlSamples(
    ids: string[],
  ): Promise<Map<string, WikidataSparqlTypeSample[]>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const url = new URL(this.sparqlEndpoint);
    url.searchParams.set('query', sparqlQuery(ids));
    url.searchParams.set('format', 'json');

    try {
      const response = await this.fetchImpl(url.toString(), {
        headers: {
          Accept: 'application/sparql-results+json',
          'User-Agent': 'seo-kb-crawler/0.1 external-entity-enrichment',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Wikidata SPARQL API returned HTTP ${response.status}: ${await response.text()}`,
        );
      }

      return samplesById(await response.json() as WikidataSparqlResponse);
    } finally {
      clearTimeout(timeout);
    }
  }
}

function sparqlQuery(ids: string[]): string {
  const values = ids.map((id) => `wd:${id}`).join(' ');
  return [
    'SELECT ?entity ?entityLabel ?type ?typeLabel ?website WHERE {',
    `VALUES ?entity { ${values} }`,
    'OPTIONAL { ?entity wdt:P31 ?type. }',
    'OPTIONAL { ?entity wdt:P856 ?website. }',
    'SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }',
    '} LIMIT 50',
  ].join(' ');
}

function samplesById(
  response: WikidataSparqlResponse,
): Map<string, WikidataSparqlTypeSample[]> {
  const byId = new Map<string, WikidataSparqlTypeSample[]>();

  for (const binding of response.results?.bindings ?? []) {
    const id = binding.entity?.value?.split('/').pop();
    if (!id) {
      continue;
    }

    const samples = byId.get(id) ?? [];
    samples.push({
      label: binding.entityLabel?.value ?? null,
      typeId: binding.type?.value?.split('/').pop() ?? null,
      typeLabel: binding.typeLabel?.value ?? null,
      website: binding.website?.value ?? null,
    });
    byId.set(id, samples);
  }

  return byId;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
