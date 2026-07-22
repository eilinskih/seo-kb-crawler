# Project Map

This is the starting point for engineers joining the repository.

## Where to start

1. Read `README.md` for the project goal, stack and local setup.
2. Read `docs/architecture.md` for the current architecture overview.
3. Read `docs/implementation-order.md` for the canonical roadmap, dependency
   graph and implementation order.
4. Read `docs/progress.md` for current status and the active work log.
5. Read `docs/repository-audit.md` for the latest stabilization audit and known
   inconsistencies.

## Canonical documents

| Need | Document |
|---|---|
| Project overview and setup | `README.md` |
| Architecture overview | `docs/architecture.md` |
| Roadmap and dependency order | `docs/implementation-order.md` |
| Current progress and work log | `docs/progress.md` |
| Working rules and review gates | `docs/codex-workflow.md` |
| Repository audit | `docs/repository-audit.md` |
| Accepted architecture decisions | `docs/decisions/` |

## Architecture documents

`docs/architecture.md` is intentionally an overview. Keep detailed design in
specialized documents:

- `docs/topic-model.md` for the Topic Engine.
- `docs/url-frontier-model.md` for the URL Frontier.
- `docs/discovery-sources-model.md` for Discovery Sources.
- `docs/crawler-worker-model.md` for the Crawler Worker.
- `docs/content-processing-model.md` for the Content Processing Pipeline.
- `docs/chunking-model.md` for the Chunking Engine.
- `docs/embedding-model.md` for the Embedding Pipeline.
- `docs/retrieval-model.md` for the Hybrid Retrieval Engine.
- `docs/context-pack-model.md` for the Context Pack API.
- `docs/entity-alias-model.md` for the Entity and Alias Layer.
- `docs/ontology-predicate-model.md` for the Ontology and Predicate Registry.
- `docs/topic-classification-model.md` for Topic Classification Strategy.
- `docs/operator-console-model.md` for the internal Operator Console.
- `docs/demand-engine-model.md` for Keyword Discovery, candidate pages and
  provider-optional demand signals.
- Future `docs/*-model.md` documents for subsystem contracts.
- `docs/decisions/` for accepted architectural decisions.

Split `docs/architecture.md` only when it stops being a readable overview.
Until then, prefer adding or extending specialized documents and linking to
them from the overview.

## Roadmap vs progress

`docs/implementation-order.md` is the only canonical roadmap and dependency
document.

`docs/progress.md` is not a roadmap. It records current status, active work,
review state and meaningful progress notes.

When adding a new issue:

1. Add its order, phase and dependency position to `docs/implementation-order.md`.
2. Add or update live status in `docs/progress.md` only when work starts,
   advances, blocks or completes.

## ADR practice

Architectural decisions should be captured as ADRs in `docs/decisions/`.

Use an ADR when a change accepts or rejects a durable architecture choice, such
as framework boundaries, persistence strategy, queue ownership, provider
abstractions, storage ownership, security posture or deployment shape.

Do not create ADRs for routine implementation details, temporary experiments
or unaccepted proposals. Proposed designs can live in subsystem model documents
until the decision is accepted.

## Current implementation boundaries

Implemented on `main`:

- Foundation NestJS monorepo.
- API application.
- Crawler worker shell and queue wiring.
- Shared common package.
- Crawler Worker contracts, result normalization and worker command handling.
- PostgreSQL/Knex package.
- Topic Engine domain, persistence and API endpoints.
- Discovery Sources contracts, planner and seed/link adapters.
- URL Frontier entries, lease lifecycle repository and crawl attempt result
  sink.
- URL Frontier BullMQ dispatch, manual dispatch API, completion feedback,
  frontier-owned crawl completion service, bounded retry backoff and success
  recrawl scheduling.
- Content Processing package boundary, domain contracts and foundation
  persistence schema.
- Content Processing service boundary and Knex repository for idempotent
  processing of successful crawl attempts.
- Content Processing initial metadata, structured data, language and geo signal
  extraction.
- Manual Content Processing API for operator-triggered processing by crawl
  attempt ID.
- Content Processing BullMQ dispatch and worker orchestration for pending
  successful crawl attempts.
- Chunking package boundary, domain contracts, tokenizer abstraction,
  deterministic semantic chunk planner, chunk type classifier and storage
  migration.
- Embedding worker app boundary, Embeddings package contracts,
  no-provider fallback, candidate selection, idempotent embedding persistence
  and storage migration.
- Retrieval package boundary, query contracts, ranking profiles, degraded
  retrieval orchestration, score explanations and deduplication.
- Context Pack package boundary, request/profile contracts, deterministic
  retrieval packaging and API endpoint.
- Entity and Alias package boundary, canonical entities, aliases, mention
  contracts, storage migration, alias resolution service and manual API
  endpoints.
- Ontology package boundary, predicate alias resolver, seed predicate registry,
  raw/canonical fact contracts and storage migration.

Designed but not implemented on `main`:

- Topic Classification Strategy for primary/secondary semantic topic
  classification after Entity and Ontology foundations.
- Full URL Frontier discovery observation ingestion, canonical relations,
  configurable retry policy, jitter and adaptive recrawl adjustment.

Not implemented:

- Demand Engine.
- Knowledge, SERP and SEO pack generation.
- Operator Console.
- SEO Agent Gateway.
