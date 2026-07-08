# Architecture Overview

SEO KB Crawler is a private, local-first SEO knowledge-base system for Codex.

The system is not a SaaS, not a public search engine and not an article generator. Its primary role is to collect, normalize, enrich and package knowledge so Codex can generate better SEO pages, research briefs and content plans.

For implementation order, dependencies and canonical terminology, see
`docs/implementation-order.md`. For current progress, see `docs/progress.md`.
For repository navigation, see `docs/project-map.md`.

This document is the architecture overview. Keep subsystem details in
specialized documents such as `docs/topic-model.md`,
`docs/url-frontier-model.md`, `docs/discovery-sources-model.md`,
`docs/crawler-worker-model.md`, `docs/content-processing-model.md`,
`docs/chunking-model.md`, `docs/demand-engine-model.md` and ADRs under
`docs/decisions/`.

## Core pipeline

```txt
Topics
  -> Demand Engine
  -> Discovery Sources
  -> URL Frontier
  -> Crawler Worker
  -> Content Processing
  -> Chunking Engine
  -> Embedding Pipeline
  -> Hybrid Retrieval
  -> Entity and Alias Layer
  -> Ontology and Predicate Registry
  -> Fact Extraction
  -> Trust and Evidence Scoring
  -> SEO Consensus
  -> SERP Intelligence
  -> Knowledge Pack Builder
  -> Codex Context Pack API
  -> Codex
```

## Design principles

1. Codex is the primary consumer.
2. Local registry decides; external providers enrich.
3. Embeddings are an index, not the source of truth.
4. Raw HTML, Markdown, plain text and chunks must remain available for reprocessing.
5. Canonical facts must reference the ontology and predicate registry.
6. Knowledge Packs explain what is known.
7. SERP Packs explain how search results present the topic.
8. Demand Packs explain what pages or keyword clusters are worth pursuing.
9. SEO output should never rely on retrieval chunks alone.

## Core layers

### Data collection

- Topic Engine
- Discovery Sources
- URL Frontier
- Crawler Worker

The proposed Topic Engine aggregate and configuration contracts are documented
in `docs/topic-model.md`. The implementation lives in
`packages/topic-engine`, is exposed by `apps/api`, and incorporates the
snapshot, canonical-policy and recrawl contract adjustments discovered during
URL Frontier design.

NestJS package boundaries and the planned Knex persistence strategy are defined
in `docs/decisions/0002-nestjs-monorepo-knex.md`.

The URL Frontier identity, lifecycle, scheduling and integration contracts are
documented in `docs/url-frontier-model.md`. The initial implementation lives in
`packages/url-frontier` and covers entry persistence, lease lifecycle, BullMQ
dispatch, crawl completion feedback, bounded retry backoff and success recrawl
scheduling. Discovery observation ingestion, canonical relations, configurable
retry policy, jitter and adaptive recrawl adjustment remain later work.

The proposed Discovery Sources run lifecycle, provider adapter, observation and
safety contracts are documented in `docs/discovery-sources-model.md`. Its
design is approved. The initial implementation lives in
`packages/discovery-sources` and covers contracts, deterministic planning,
seed and extracted-link adapters; URL Frontier persistence, external search
providers and sitemap fetching remain later work.

The Crawler Worker adapter boundary, safe network gateway, robots policy,
crawl-result and extracted-link contracts are documented in
`docs/crawler-worker-model.md`. The initial implementation lives in
`packages/crawler` and covers command validation, adapter selection, safe
network gateway, robots policy, Topic policy enforcement, HTTP fetch adapter,
result normalization and worker job handling. URL Frontier owns durable crawl
attempt persistence and completion scheduling through its completion boundary.
Content Processing consumes successful crawl attempts after URL Frontier
completion; URL Frontier does not depend on Content Processing state for crawl
lease completion.

### Document normalization

- Content Processing Pipeline
- Document versioning
- Metadata extraction
- Structured data extraction
- Language and geo hints

The implemented initial Content Processing Pipeline contract is documented in
`docs/content-processing-model.md`. It stores stable documents and document
versions, preserves raw HTML, cleaned Markdown and plain text artifacts,
extracts initial metadata and structured-data signals, and records processing
state independently from crawl state.

The implemented Chunking Engine MVP contract is documented in
`docs/chunking-model.md`. It consumes immutable document versions and produces
semantic SEO-aware chunks for embeddings, retrieval, extraction and context
packs.

### Semantic indexing

- Chunking Engine
- Embedding Pipeline
- Hybrid Retrieval Engine

The proposed Embedding Pipeline contract is documented in
`docs/embedding-model.md`. It treats embeddings as an index over immutable
chunks, keeps provider/model identity with every vector, and requires a
local-first fallback mode when paid or hosted providers are unavailable.

The proposed Hybrid Retrieval Engine contract is documented in
`docs/retrieval-model.md`. It combines vector, keyword and metadata search,
supports degraded keyword/metadata-only retrieval when vectors are unavailable,
and returns score explanations for downstream Context Pack assembly.

The Context Pack API contract and foundation implementation are documented in
`docs/context-pack-model.md`. It packages retrieval results into structured,
model-agnostic context for Codex and future LLM consumers without generating
final content or emitting vendor-specific prompts.

### Knowledge layer

- Entity and Alias Layer
- External Entity Enrichment Providers
- Ontology and Predicate Registry
- Fact Extraction Worker
- Source Trust and Evidence Scoring
- SEO Consensus and Conflict Layer

The Entity and Alias Layer design and foundation implementation are documented
in `docs/entity-alias-model.md`. It is a lightweight normalization layer for
canonical entities, multilingual aliases and chunk mentions. It is not the full
Knowledge Graph and must not make retrieval dependent on entity data.

The proposed Ontology and Predicate Registry design is documented in
`docs/ontology-predicate-model.md`. It prevents future fact extraction from
turning model-generated predicate strings into canonical knowledge without
reviewed registry normalization.

### SEO intelligence layer

- Demand Engine
- SERP Intelligence Layer
- Topic Expansion Engine
- SEO Page Candidate Scoring
- Codex SEO Pack Generator

The Demand Engine contract is documented in `docs/demand-engine-model.md`.
Demand Engine answers what should be written by producing keyword candidates,
clusters and candidate pages from provider-optional demand sources. Paid SEO
providers improve confidence and prioritization, but fallback discovery must
continue without Ahrefs, Semrush, SE Ranking or equivalent credentials.

### Codex integration layer

- Context Pack API
- Knowledge Pack Builder
- SERP Pack Builder

## Universal core, vertical-specific extension

The system must not be tied to gambling or any single niche.

Universal core:

```txt
topic
document
chunk
language
geo
entity
alias
predicate
attribute
source
evidence
intent
```

Vertical-specific layers may define optional entities, predicates and content tags:

```txt
gambling: provider, bonus, RTP, demo mode, payment method
automotive: brand, model, engine, part, symptom, OEM
legal: law, article, institution, procedure, deadline
ecommerce: product, category, feature, price, review
travel: destination, season, visa, hotel, attraction
software: library, API, version, framework, error, package
```

## Storage strategy

Hot data:

- documents
- document_versions metadata
- chunks
- embeddings
- entities
- aliases
- canonical facts
- evidence links
- SERP snapshots
- demand metric snapshots
- keyword candidates
- candidate pages

Cold or compressed data:

- raw HTML
- historical document versions
- old crawl artifacts

Raw HTML should be compressed, preferably gzip or equivalent, because it will become one of the largest storage consumers.

## Processing strategy

Mandatory fast path:

```txt
crawl -> process -> chunk -> embed -> retrieve -> context pack
```

Eventually consistent background path:

```txt
entity extraction -> ontology normalization -> fact extraction -> trust scoring -> consensus -> SERP intelligence
```

This keeps the system usable on A1502 while allowing deeper knowledge processing over time.

## Foundation runtime

The initial implementation uses one NestJS monorepo with independently runnable applications:

```txt
apps/api
apps/crawler-worker
packages/common
packages/content-processing
packages/crawler
packages/db
packages/discovery-sources
packages/topic-engine
packages/url-frontier
```

Planned packages include:

```txt
packages/demand-engine
```

PostgreSQL is the source of truth. The local PostgreSQL service uses the pgvector image and enables the `vector` extension at initialization so later embedding work does not require replacing the database runtime.

Redis is queue infrastructure only. BullMQ owns background job transport, while queue names and connection parsing live in `packages/common`. Domain behavior remains in application or future domain packages.

The API exposes `GET /health` as a readiness endpoint. It verifies PostgreSQL and Redis connectivity and returns an unavailable response if either dependency cannot be reached.

See `docs/decisions/0001-foundation.md` for the Issue #1 decisions and
consequences. See `docs/decisions/0003-demand-engine-provider-optional.md` for
the provider-optional Demand Engine decision.

## Topic Engine runtime

The Topic Engine is a NestJS library boundary with a framework-independent
aggregate, an application service and a Knex repository adapter. PostgreSQL
stores current topic state in `topics` and immutable configuration history in
`topic_configuration_snapshots`.

Configuration replacement is atomic and uses optimistic concurrency on
`configuration_version`. Lifecycle changes do not create configuration
snapshots because they do not alter the policy consumed by downstream work.
SHA-256 crawl-policy and relevance-profile fingerprints let the URL Frontier
compare effective policy inputs without interpreting their JSON structure.

Database migrations are bundled with `packages/db` so both production bundles
can initialize the same schema without requiring TypeScript source files at
runtime. Knex's migration lock serializes concurrent API and worker startup.
