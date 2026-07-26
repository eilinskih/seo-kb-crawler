import {
  ExternalEntityProvider,
  ExternalEntityProviderCapability,
} from './domain/external-entity-enrichment-types';
import { GoogleKnowledgeGraphProvider } from './providers/google-knowledge-graph.provider';
import { LocalSchemaOrgEntityProvider } from './providers/local-schema-org-entity.provider';
import { WikidataEntityProvider } from './providers/wikidata-entity.provider';

export class ExternalEntityProviderRegistry {
  constructor(
    private readonly providers: ExternalEntityProvider[] = [
      new GoogleKnowledgeGraphProvider(),
      new WikidataEntityProvider(),
      new LocalSchemaOrgEntityProvider(),
    ],
  ) {}

  listProviders(): ExternalEntityProvider[] {
    return [...this.providers];
  }

  findProviders(
    capabilities: ReadonlyArray<ExternalEntityProviderCapability> = [],
  ): ExternalEntityProvider[] {
    if (capabilities.length === 0) {
      return this.listProviders();
    }
    return this.providers.filter((provider) =>
      capabilities.some((capability) =>
        provider.capabilities.includes(capability),
      ),
    );
  }
}
