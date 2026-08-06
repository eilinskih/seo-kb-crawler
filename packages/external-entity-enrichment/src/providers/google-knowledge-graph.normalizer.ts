import {
  ExternalEntityCandidate,
  ExternalEntityEnrichmentRequest,
} from '../domain/external-entity-enrichment-types';

export interface GoogleKnowledgeGraphSearchResponse {
  itemListElement?: GoogleKnowledgeGraphSearchItem[];
}

interface GoogleKnowledgeGraphSearchItem {
  resultScore?: number;
  result?: {
    '@id'?: string;
    '@type'?: string[];
    name?: string;
    description?: string;
    url?: string;
    detailedDescription?: {
      url?: string;
      articleBody?: string;
      license?: string;
    };
  };
}

export function normalizeGoogleKnowledgeGraphResponse(
  response: GoogleKnowledgeGraphSearchResponse,
  request: ExternalEntityEnrichmentRequest,
): ExternalEntityCandidate[] {
  const observedAt = request.now ?? null;

  return (response.itemListElement ?? [])
    .filter((item) => Boolean(item.result?.name))
    .map((item) => {
      const result = item.result as NonNullable<GoogleKnowledgeGraphSearchItem['result']>;
      const score = item.resultScore ?? null;
      const sourceUrl = result.detailedDescription?.url ?? result.url ?? null;

      return {
        providerKey: 'google_knowledge_graph',
        source: 'google_knowledge_graph',
        externalId: result['@id'] ?? null,
        externalIdType: result['@id'] ? 'google_kg_id' : null,
        name: result.name as string,
        description:
          result.detailedDescription?.articleBody ??
          result.description ??
          null,
        types: result['@type'] ?? [],
        aliases: [],
        urls: urlsFrom(result.url, result.detailedDescription?.url),
        score,
        confidence: confidenceForScore(score),
        language: request.language,
        metadata: {
          providerDescription: result.description ?? null,
          weakCandidate: score !== null && score < 1,
        },
        provenance: {
          providerKey: 'google_knowledge_graph',
          source: 'google_knowledge_graph',
          sourceUrl,
          sourceDocumentId: null,
          observedAt,
        },
      };
    });
}

function confidenceForScore(score: number | null): ExternalEntityCandidate['confidence'] {
  if (score === null) {
    return 'unknown';
  }

  if (score >= 100) {
    return 'high';
  }

  if (score >= 1) {
    return 'medium';
  }

  return 'low';
}

function urlsFrom(...urls: Array<string | undefined>): string[] {
  return [...new Set(urls.filter((url): url is string => Boolean(url)))];
}
