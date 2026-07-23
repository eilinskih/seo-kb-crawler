# External SEO Data Providers Model

Status: Foundation implementation in review for Issue #40.

## Purpose

External SEO Data Providers define the optional enrichment layer for paid and
owned SEO intelligence sources.

The core platform must remain useful without Ahrefs, Semrush, SE Ranking or any
equivalent paid provider. External providers improve confidence,
prioritization, competitor analysis and scoring, but they must never become
required for crawling, research, retrieval, knowledge extraction, SERP intent
analysis or SEO Pack assembly.

Core principle:

```txt
Ahrefs improves scoring.
Ahrefs never blocks the pipeline.
```

## Responsibilities

This subsystem owns:

- provider-neutral contracts for external SEO enrichment;
- provider capability metadata;
- provider availability and degraded-mode status;
- normalized keyword, competitor, traffic, authority and SERP-history
  observations;
- provider attribution for every imported metric;
- fail-open aggregation behavior;
- nullable metric snapshots;
- warnings that explain missing, stale, rate-limited or disabled providers;
- repository contracts for future persistence.

This subsystem does not own:

- keyword candidate generation, which remains in Demand Engine;
- SERP structure collection and SERP Pack assembly, which remain in SERP
  Intelligence;
- SERP Intent Analyzer decisions;
- Topic Expansion or Long-tail Discovery candidate logic;
- SEO Page Candidate Scoring formulas;
- SEO Pack assembly;
- SEO Agent Gateway generation context rules;
- concrete paid API credentials in the core domain;
- provider-specific schemas leaking into downstream packages.

## Provider Model

The provider abstraction should support multiple provider classes:

- `FallbackSeoSignalsProvider`: adapter-scoped free-first observations from
  Research Assets, crawler output, SERP snapshots, extracted headings, FAQs,
  entities, aliases and Topic Expansion signals.
- `SerpSnapshotProvider`: provider-neutral observations derived from stored
  SERP snapshots and SERP Packs.
- `GoogleSearchConsoleProvider`: future owned-data provider for sites the
  operator controls.
- `AhrefsProvider`: optional paid provider for keyword, competitor, traffic and
  authority enrichment.
- Future optional providers such as Semrush, SE Ranking, Google Ads Keyword
  Planner, DataForSEO or similar APIs.

Provider keys are implementation details of this subsystem. Downstream
consumers should depend on normalized capabilities and metric snapshots rather
than provider-specific response shapes.

## Capabilities

Provider capabilities should be explicit and discoverable:

- keyword intelligence;
- search volume;
- keyword difficulty;
- CPC;
- trends and seasonality;
- country-specific demand;
- language variants;
- traffic potential;
- competitor keywords;
- organic competitors;
- top pages;
- backlinks;
- referring domains;
- authority signals;
- SERP history;
- owned performance data.

No provider is expected to implement every capability.

## Data Contracts

The first implementation should introduce provider-neutral contracts similar
to:

- `ExternalSeoProviderKey`
- `ExternalSeoProviderCapability`
- `ExternalSeoProviderStatus`
- `ExternalSeoProviderWarning`
- `ExternalSeoMetricSnapshot`
- `ExternalSeoKeywordObservation`
- `ExternalSeoCompetitorObservation`
- `ExternalSeoAuthorityObservation`
- `ExternalSeoTrafficObservation`
- `ExternalSeoEnrichmentPack`

Provider status should distinguish at least:

- `available`;
- `disabled`;
- `misconfigured`;
- `rate_limited`;
- `unavailable`;
- `degraded`.

Metric snapshots must keep:

- normalized metric name;
- nullable value;
- market;
- language;
- provider key;
- source capability;
- fetched timestamp;
- confidence;
- warning codes.

Missing paid-provider metrics must be represented as `null`, not fabricated
values.

## Fail-open Behavior

Provider execution must fail open.

When a provider is disabled, misconfigured, rate-limited, unavailable or missing
credentials:

- the enrichment request should return provider warnings;
- downstream consumers should receive partial enrichment when available;
- unknown volume, difficulty, CPC, traffic and authority values should remain
  `null`;
- fallback/internal signals should continue to flow;
- the pipeline should not fail solely because an external provider failed.

Provider failures may reduce confidence. They must not stop Demand Engine,
SERP Intelligence, Topic Expansion, Long-tail Discovery, SEO Page Candidate
Scoring, SEO Pack Generator or SEO Agent Gateway execution.

## Downstream Consumers

External SEO Data Providers may enrich these subsystems:

- Demand Engine Runtime (#98): nullable demand metrics, owned performance data
  and provider-backed confidence evidence.
- SERP Intelligence (#18): traffic, SERP-history and competitor context.
- Topic Expansion Engine (#19): provider-backed keyword and competitor
  expansion signals.
- Long-tail Discovery Engine (#134): optional validation of generated
  long-tail candidates.
- SEO Page Candidate Scoring (#20): volume, difficulty, traffic potential,
  authority and competitor signals.
- SEO Pack Generator (#21): richer page recommendations and planning context.
- SEO Agent Gateway (#42): optional provider-attributed enrichment in
  model-agnostic generation context.

SERP Intent Analyzer (#30) must not depend on paid provider data. Intent
analysis should remain grounded in SERP structure, competitor content and
Research Assets.

## Storage Model

Future persistence should store provider outputs as snapshots instead of
overwriting canonical candidate state.

Expected storage areas:

- provider runs;
- provider health/status events;
- keyword metric snapshots;
- competitor observations;
- top-page observations;
- authority observations;
- traffic observations;
- enrichment pack snapshots.

Snapshots should include provider identity, market, language, collection time
and freshness metadata so historical provider data can be audited or replaced
without changing canonical Demand Engine entities.

## Services

The package should expose services similar to:

- `ExternalSeoProviderRegistry` for enabled providers and capabilities;
- `ExternalSeoProviderHealthService` for provider status and warnings;
- `ExternalSeoEnrichmentService` for provider-neutral enrichment requests;
- `ExternalSeoNormalizationService` for converting provider responses into
  normalized observations;
- `ExternalSeoFallbackService` for internal/free-first enrichment behavior;
- `ExternalSeoDataProviderRepository` for future snapshot persistence.

Consumers should request enrichment through the service boundary. They should
not call provider adapters directly.

## Data Flow

```txt
Topic or Candidate Context
  -> External SEO Enrichment Request
  -> Enabled Providers
  -> Provider-neutral Observations
  -> Nullable Metric Snapshots
  -> External SEO Enrichment Pack
  -> Demand Engine / SERP Intelligence / Topic Expansion / Scoring / SEO Pack / Gateway
```

The enrichment pack is optional context. It is not a replacement for Demand
Pack, SERP Pack, SERP Intent Pack, Knowledge Pack or SEO Pack.

## MVP Scope

The first implementation should include:

1. A package boundary for external SEO provider contracts.
2. Provider capability and status DTOs.
3. Provider-neutral observation and metric snapshot DTOs.
4. A fail-open enrichment service.
5. A no-provider or internal fallback provider.
6. Repository abstraction only.
7. Tests proving missing providers and missing credentials remain non-blocking.

The first implementation should not include:

- concrete Ahrefs, Semrush or SE Ranking API calls;
- credentials management UI;
- billing or quota management;
- scheduled provider refresh jobs;
- concrete database migrations unless required for repository tests;
- provider-specific schemas outside the provider adapter boundary;
- any hard dependency from core modules to paid provider availability.

## Implementation Notes

The runtime foundation package is `packages/external-seo-data-providers`.

The initial implementation:

- defines provider capability, status, warning, observation, metric snapshot
  and enrichment pack contracts;
- defines the `ExternalSeoDataProvider` adapter boundary;
- includes `FallbackSeoSignalsProvider` for free-first, no-credential fallback
  behavior;
- exposes `ExternalSeoProviderRegistry` for capability-based provider
  selection;
- exposes `ExternalSeoEnrichmentService` for fail-open enrichment requests;
- records missing fallback metrics as `null`;
- returns provider warnings instead of throwing when providers are disabled,
  misconfigured or unavailable;
- defines repository contracts and an in-memory test repository.

Concrete paid provider integrations, credentials management, scheduled refresh
jobs and durable persistence remain future work.

## Review Gates

Before concrete provider integration begins:

- Architecture Steward must confirm the provider boundary does not leak
  provider-specific schemas into core modules.
- SEO Research Architect must confirm the normalized capabilities are useful
  for keyword, competitor and opportunity research.
- Product Owner must confirm provider-optional behavior remains required.
- `docs/implementation-order.md`, `docs/progress.md` and
  `docs/project-map.md` must remain synchronized.
