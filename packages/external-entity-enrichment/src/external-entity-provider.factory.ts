import { ConfigService } from '@nestjs/config';
import { ExternalEntityProvider } from './domain/external-entity-enrichment-types';
import { GoogleKnowledgeGraphProvider } from './providers/google-knowledge-graph.provider';
import { LocalSchemaOrgEntityProvider } from './providers/local-schema-org-entity.provider';
import { WikidataEntityProvider } from './providers/wikidata-entity.provider';

export function configuredExternalEntityProviders(
  config: Pick<ConfigService, 'get'>,
): ExternalEntityProvider[] {
  return [
    new GoogleKnowledgeGraphProvider({
      apiKey:
        stringConfig(config.get<string>('GOOGLE_KNOWLEDGE_GRAPH_API_KEY')) ??
        stringConfig(config.get<string>('GOOGLE_KG_API_KEY')),
      disabled: booleanConfig(
        config.get<string>('GOOGLE_KNOWLEDGE_GRAPH_DISABLED'),
      ),
      endpoint: config.get<string>('GOOGLE_KNOWLEDGE_GRAPH_ENDPOINT'),
      limit: numberConfig(config.get<string>('GOOGLE_KNOWLEDGE_GRAPH_LIMIT')),
      timeoutMs: numberConfig(
        config.get<string>('GOOGLE_KNOWLEDGE_GRAPH_TIMEOUT_MS'),
      ),
    }),
    new WikidataEntityProvider({
      enabled: booleanConfig(config.get<string>('WIKIDATA_ENABLED')),
      searchEndpoint: config.get<string>('WIKIDATA_SEARCH_ENDPOINT'),
      sparqlEndpoint: config.get<string>('WIKIDATA_SPARQL_ENDPOINT'),
      limit: numberConfig(config.get<string>('WIKIDATA_LIMIT')),
      timeoutMs: numberConfig(config.get<string>('WIKIDATA_TIMEOUT_MS')),
    }),
    new LocalSchemaOrgEntityProvider(),
  ];
}

function booleanConfig(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function numberConfig(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function stringConfig(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
