# ADR 0001: Foundation Runtime and Repository Layout

- Status: Accepted for Issue #1 review
- Date: 2026-06-09

## Context

The project needs a local-first foundation for independently runnable API and crawler worker processes. PostgreSQL must remain the source of truth, pgvector must be available for later semantic indexing, and Redis with BullMQ must support background work without coupling domain modules to a specific crawler implementation.

## Decision

Use a single NestJS monorepo with:

- `apps/api` for HTTP endpoints and future Codex-facing APIs.
- `apps/crawler-worker` for BullMQ job consumption.
- `packages/common` for configuration, queue contracts and transport-neutral shared types.
- `packages/db` for the PostgreSQL connection adapter.
- A root package and lockfile so both applications use one dependency graph.
- PostgreSQL 16 from the pgvector image, with the `vector` extension enabled during first database initialization.
- Redis 7 and BullMQ for background queue transport.
- Docker Compose for the complete local runtime, with persistent PostgreSQL data and dependency healthchecks.
- Node.js `26.3.0` pinned through `.nvmrc` and container base images.
- CodeRabbit as the automated pull request review gate before human review.
- Dependabot for npm, Docker, Docker Compose and GitHub Actions updates.

The API health endpoint checks both PostgreSQL and Redis. It returns HTTP 503 when either dependency is unavailable so container and operator health signals reflect actual readiness.

The crawler worker registers the `crawl` queue and logs jobs, but does not crawl pages. Crawl behavior belongs to Issue #5.

## Consequences

- Applications can be built and deployed independently while sharing typed foundation code.
- Infrastructure dependencies remain explicit and replaceable behind Nest providers.
- Database schema ownership is deferred to the issues that introduce domain models.
- A fresh PostgreSQL volume automatically supports vector columns; existing volumes require the extension to be enabled manually if initialization has already run.
- The health endpoint is a readiness check, not merely a process liveness check.
- CodeRabbit review focuses on architecture, best practices, performance and
  security, with path-specific rules matching the monorepo boundaries.
- Dependency updates arrive as reviewable pull requests instead of silently
  changing the local runtime.
