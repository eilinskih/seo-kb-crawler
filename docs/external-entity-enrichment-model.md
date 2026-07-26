# External Entity Enrichment Providers Model

- Status: Foundation implementation complete for Issue #17
- Issue: #17
- Date: 2026-07-26

## Purpose

External Entity Enrichment Providers add optional public-entity signals to the
local Entity and Alias Layer.

They help with disambiguation, aliases, external IDs, public descriptions,
entity types and multilingual matching. They do not replace local entity
authority.

Core principle:

```txt
External providers enrich.
Local registry decides.
```

The platform must continue crawling, retrieval, Context Pack generation,
Knowledge Pack generation and SEO Pack generation when all external entity
providers are missing, misconfigured, disabled, rate-limited or unavailable.

## Boundaries

This subsystem owns:

- provider-neutral external entity enrichment contracts;
- provider capability and status metadata;
- normalized external entity candidates;
- external ID signals;
- provider confidence metadata;
- provenance for every external signal;
- enrichment attempt tracking;
- provider execution cache and rate-limit contracts;
- fail-open execution behavior;
- storage for external source metadata, attempts and external ID observations.

This subsystem does not own:

- canonical entity creation;
- alias approval;
- ontology type approval;
- fact extraction;
- source trust scoring;
- SEO consensus;
- Knowledge Pack assembly;
- SERP analysis;
- content generation;
- mandatory provider credentials.

Entity and Alias Layer remains the authority for canonical entities and
approved aliases. Ontology and Predicate Registry remains the authority for
accepted entity types and predicates.

## Providers

Initial provider classes:

- `GoogleKnowledgeGraphProvider`: optional paid-key provider boundary for
  public entities. Without an API key it reports `misconfigured` and is skipped.
- `WikidataEntityProvider`: optional public provider boundary for QIDs,
  multilingual aliases and sitelinks. It is disabled by default until scheduled
  provider execution and rate-limit policy are configured.
- `LocalSchemaOrgEntityProvider`: local free-first signal provider that
  normalizes Schema.org entity signals extracted from crawled pages.

Provider-specific response shapes must not leak into downstream packages.

Provider execution policy is optional and local to this subsystem. It can
cache normalized provider results and rate-limit public or paid providers.
Local signals such as Schema.org extraction are not rate-limited by this
policy.

## Data Flow

```txt
entity enrichment request
  -> provider registry
  -> provider status checks
  -> available providers return normalized candidates
  -> unavailable providers emit warnings
  -> enrichment pack records candidates, external IDs and provenance
  -> local review/merge flow may accept aliases or external IDs later
```

The first implementation returns an `ExternalEntityEnrichmentPack`. It is an
evidence package, not an automatic mutation command for local entities.

## Data Contracts

Provider descriptors expose:

- provider key;
- tier;
- capabilities;
- status;
- warnings.

Normalized candidates expose:

- provider key;
- source type;
- external ID and external ID type when present;
- name;
- description;
- types;
- aliases;
- URLs;
- score when provider-backed;
- confidence;
- language;
- bounded metadata;
- provenance.

External ID signals expose:

- provider key;
- external ID;
- external ID type;
- confidence;
- source URL;
- observation timestamp.

## Storage

Foundation migration adds:

- `external_entity_sources`;
- `entity_enrichment_attempts`;
- `entity_external_ids`.

`entity_id` is nullable in enrichment attempts and external ID observations.
This allows the platform to store external evidence before the local registry
accepts or links it.

Provider evidence must keep enough provenance for review and debugging. It
must not silently overwrite local aliases, entity descriptions or ontology
types.

## Failure Behavior

Provider execution is fail-open:

- disabled and misconfigured providers are skipped with warnings;
- provider exceptions become warnings;
- rate-limited providers are skipped with warnings;
- cached normalized results may be reused within a configured TTL;
- local Schema.org signals can still produce candidates without external API
  credentials;
- empty enrichment packs are marked degraded;
- downstream packages must treat missing enrichment as normal.

## Deferred Work

- Real Google Knowledge Graph fetch execution.
- Real Wikidata API/SPARQL execution and rate-limit policy.
- Scheduled enrichment jobs.
- Operator review UI for accepting external aliases and IDs.
- Knex repository implementation for persisted pack retrieval.
- Knowledge Pack and SEO Agent Gateway consumption of accepted external
  signals.
