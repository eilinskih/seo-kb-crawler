# External Entity Enrichment Providers Model

- Status: Foundation implementation complete for Issue #17; provider execution
  validation in progress for Issue #181
- Issues: #17, #181
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
  Issue #181 adds live Google Knowledge Graph Search API execution behind
  optional credentials.
- `WikidataEntityProvider`: optional public provider boundary for QIDs,
  multilingual aliases, sitelinks and public entity types. It is disabled by
  default and may be enabled explicitly for Wikidata Search API plus SPARQL
  type/website enrichment.
- `LocalSchemaOrgEntityProvider`: local free-first signal provider that
  normalizes Schema.org entity signals extracted from crawled pages.

Provider-specific response shapes must not leak into downstream packages.

Provider execution policy is optional and local to this subsystem. It can
cache normalized provider results and rate-limit public or paid providers.
Local signals such as Schema.org extraction are not rate-limited by this
policy.

## Provider Validation Fixtures

Issue #181 requires a controlled provider validation pass before concrete live
adapter execution.

Live probes were run with a fixed query set:

- clear public entities: Taylor Swift, Warsaw;
- product/media/game entities: Frogger, Frogger Jump;
- ambiguous entity: Apple;
- local/business-like long-tail phrase: laser hair removal Poland;
- expected missing entity: zzzz long tail no entity phrase qwerty.

Observed Google Knowledge Graph behavior:

- clear public entities return scored candidates with `@id`, `@type`, `name`,
  `description`, optional `url` and optional `detailedDescription`;
- long-tail phrases can return very weak candidates with extremely low scores;
- missing entities can return an empty `itemListElement`;
- provider score must influence confidence, and weak candidates must remain
  review evidence rather than accepted entities.

Observed Wikidata behavior:

- `wbsearchentities` returns QID, label, description, aliases, concept URI and
  relative wiki URL;
- search ordering can be ambiguous, for example Taylor Swift returned an album
  before the person;
- long-tail phrases can return no candidates;
- SPARQL type/website enrichment can return multiple rows per entity or no rows
  for selected claims.

Sanitized offline fixtures live under
`packages/external-entity-enrichment/src/providers/__fixtures__/`.
Ordinary tests must use these fixtures and must not require live provider
access. Optional live smoke tests may be added later behind explicit env vars
and API keys.

## Google Knowledge Graph Execution

Google Knowledge Graph execution is optional.

Configuration:

- `GOOGLE_KNOWLEDGE_GRAPH_API_KEY` or `GOOGLE_KG_API_KEY` enables the provider;
- `GOOGLE_KNOWLEDGE_GRAPH_ENDPOINT` may override the API endpoint;
- `GOOGLE_KNOWLEDGE_GRAPH_LIMIT` may override result limit;
- `GOOGLE_KNOWLEDGE_GRAPH_TIMEOUT_MS` may override request timeout;
- `GOOGLE_KNOWLEDGE_GRAPH_DISABLED` disables the provider explicitly.

When no API key is configured, the provider reports `misconfigured` and the
enrichment service skips it with warnings. Provider errors are converted by the
service into degraded warnings so local Schema.org fallback can still produce
candidates.

## Wikidata Execution

Wikidata execution is optional and disabled by default because it depends on a
public API and SPARQL endpoint with external availability and rate-limit
constraints.

Configuration:

- `WIKIDATA_ENABLED=true` enables the provider;
- `WIKIDATA_SEARCH_ENDPOINT` may override the `wbsearchentities` endpoint;
- `WIKIDATA_SPARQL_ENDPOINT` may override the SPARQL endpoint;
- `WIKIDATA_LIMIT` may override search result limit;
- `WIKIDATA_TIMEOUT_MS` may override request timeout.

When enabled, the provider first calls `wbsearchentities` and normalizes QID,
label, description, aliases and source URLs into provider-neutral candidates.
It then attempts a bounded SPARQL enrichment pass for candidate entity types
and official website URLs.

SPARQL enrichment is best-effort. Search candidates remain usable when SPARQL
fails, and the provider returns an explicit degraded warning. Search API
transport errors are converted by the enrichment service into fail-open
provider warnings.

Wikidata candidates are evidence only. QIDs, aliases, URLs and type labels do
not automatically mutate the local Entity and Alias Layer or the Ontology and
Predicate Registry.

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

`KnexExternalEntityEnrichmentRepository` persists enrichment packs into those
tables. It stores provider status snapshots, attempt-level warnings and
normalized candidates in `entity_enrichment_attempts`, refreshes provider
source metadata in `external_entity_sources`, and upserts external ID
observations in `entity_external_ids`.

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

- Provider-specific rate-limit policy and persistent execution cache.
- Optional live smoke tests gated by provider credentials.
- Scheduled enrichment jobs.
- Operator review UI for accepting external aliases and IDs.
- Knowledge Pack and SEO Agent Gateway consumption of accepted external
  signals.
