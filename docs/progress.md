# Implementation Progress

This document is the live status and work-log tracker for Codex and human
review.

Codex must update this file whenever it starts, advances or completes an issue.

Roadmap order, phases and dependency rules live only in
`docs/implementation-order.md`. Do not turn this file into a competing roadmap.

## Status legend

- Not started
- In progress
- Design approved
- Blocked
- Review needed
- Done

## Rules for Codex

1. Work on one issue at a time unless explicitly instructed otherwise.
2. Before starting an issue, update its status to `In progress`.
3. Use `Design approved` when design review is complete but implementation is deferred.
4. When implementation or a design-only issue is ready for review, use `Review needed`.
5. Use `Done` only after both required design and implementation reviews.
6. Add a short progress note for meaningful implementation steps.
7. If blocked, set status to `Blocked` and explain why.
8. Do not skip architectural docs when the issue requires them.
9. Do not introduce new major architecture without updating docs.
10. Do not generate SEO content directly from retrieval chunks alone.
11. Codex-facing outputs should use Knowledge Pack + SERP Pack when available.

## Current status snapshot

| Issue | Title | Status | Notes |
|---|---|---|---|
| #1 | Foundation: Monorepo bootstrap and local infrastructure | Done | Human review completed on 2026-06-10. |
| #2 | Topic Engine: design topic definitions and crawl configuration model | Done | PR #31 merged into `main`; GitHub issue remains open. |
| #3 | URL Frontier: design discovery queue and crawl scheduling | Design approved | Implementation follows reviewed #4 and #5 contracts. |
| #41 | Implementation Order and Roadmap Governance | Done | PR #46 merged documentation governance into `main`. |
| #4 | Discovery Sources: design URL discovery providers | Done | PR #50 merged initial package contracts, planner and seed/link adapters into `main`. |
| #5 | Crawler Worker: implement controlled page crawling pipeline | In progress | Initial package boundary, command handling and result normalization are implemented in this branch. |
| #6 | Content Processing Pipeline | Not started | Depends on #5. |
| #7 | Chunking Engine | Not started | Depends on #6. |
| #8 | Embedding Pipeline | Not started | Depends on #7. |
| #9 | Hybrid Retrieval Engine | Not started | Depends on #8. |
| #10 | Codex Context Pack API | Not started | Depends on #9. |
| #11 | Entity and Alias Layer | Not started | Can start after #7, integrates with #9/#10. |
| #12 | Ontology and Predicate Registry | Not started | Required before canonical fact extraction. |
| #13 | Fact Extraction Worker | Not started | Depends on #11 and #12. |
| #14 | Knowledge Pack Builder | Not started | Depends on #9, #11, #12, #13. |
| #15 | Source Trust and Evidence Scoring | Not started | Depends on #13/#14 contracts. |
| #16 | SEO Consensus and Conflict Layer | Not started | Depends on #13/#15. |
| #17 | External Entity Enrichment Providers | Not started | Optional enrichment; must be non-blocking. |
| #18 | SERP Intelligence Layer | Not started | SEO-first layer; required before #30. |
| #30 | SERP Intent Analyzer | Not started | Deferred until #18. |
| #19 | Topic Expansion Engine | Not started | Depends on #18 and knowledge signals. |
| Future issue | Long-tail Discovery Engine | Not started | Future Research Engine capability after Topic Expansion, Knowledge Graph, SERP and intent signals. |
| #20 | SEO Page Candidate Scoring | Not started | Depends on #18/#19. |
| #21 | SEO Pack Generator | Not started | Depends on Knowledge Pack, SERP Pack and SERP Intent Pack. |
| #42 | SEO Agent Gateway | Not started | Deferred until #10, #14, #18, #21 and #43. |
| #43 | Research Engine Scheduling | Not started | Depends on Topic, Frontier, Discovery and Crawler contracts. |
| #40 | External SEO Data Providers | Not started | Optional and deferred; must never block the core pipeline. |

## Active work log

Add entries here in reverse chronological order.

Date: 2026-07-03
Issue: #5
Status: In progress
Summary:
- Created `issue/5-crawler-worker-implementation` from updated `main` after
  PR #50 merge.
- Synchronized Issue #4 to Done after merge.
- Started Crawler Worker implementation from the accepted design in
  `docs/crawler-worker-model.md`.
- Added `packages/crawler` with command validation, adapter contracts, adapter
  selection and crawl result normalization.
- Wired `apps/crawler-worker` to the crawler command handler without adding
  network crawling or concrete adapters.
- Added focused unit tests for command validation, adapter selection, result
  normalization and unconfigured-adapter handling.
Changed files:
- apps/crawler-worker/src/crawl.processor.ts
- apps/crawler-worker/src/crawler-worker.module.ts
- docs/architecture.md
- docs/crawler-worker-model.md
- docs/implementation-order.md
- docs/progress.md
- docs/project-map.md
- jest.config.js
- nest-cli.json
- packages/crawler
- tsconfig.json
Next step:
- Add safe network gateway and concrete adapter implementation only after this
  initial boundary slice is reviewed.

Date: 2026-07-03
Issue: #4
Status: Done
Summary:
- PR #50 merged into `main`.
- Discovery Sources now includes package contracts, deterministic planning,
  candidate observation idempotency, run lifecycle and seed/link adapters.
- Review feedback was addressed before merge by clearing transient run state on
  completion and bounding provider identities for long seed/link URLs.
Changed files:
- packages/discovery-sources
- docs/architecture.md
- docs/discovery-sources-model.md
- docs/implementation-order.md
- docs/progress.md
- docs/project-map.md
- nest-cli.json
- jest.config.js
- tsconfig.json
Next step:
- Continue with Issue #5 Crawler Worker implementation.

Date: 2026-07-03
Issue: #4
Status: Review needed
Summary:
- Created `issue/4-discovery-sources-implementation` from updated `main` after
  PR #49 merge.
- Added `packages/discovery-sources` as a NestJS library boundary.
- Implemented framework-independent Discovery run contracts, lifecycle,
  deterministic planning, candidate observation idempotency and provider
  adapter interfaces.
- Implemented seed and extracted-link adapters because they do not require
  external provider access, sitemap fetching, URL Frontier persistence or
  crawler runtime behavior.
- Added focused unit tests for planning, run lifecycle, idempotency and
  seed/link adapter emission.
- Synchronized #5 to Design approved after PR #49 merge.
Changed files:
- README.md
- docs/architecture.md
- docs/discovery-sources-model.md
- docs/implementation-order.md
- docs/progress.md
- docs/project-map.md
- nest-cli.json
- jest.config.js
- tsconfig.json
- packages/discovery-sources
Next step:
- Human implementation review of Issue #4. Do not implement Issue #5,
  Issue #3 or external discovery providers before approval.

Date: 2026-07-03
Issue: #5
Status: Design approved
Summary:
- Created `issue/5-crawler-worker-design` from updated `main` after PR #48
  merge.
- Synchronized Issue #4 status after PR #47 merge.
- Designed the Crawler Worker as a controlled page-crawling worker behind a
  provider-neutral `CrawlerAdapter` boundary.
- Defined safe network gateway, robots policy, rate limiting, adapter
  selection, crawl-result, extracted-link, redirect/canonical and media
  metadata contracts.
- Preserved URL Frontier scheduling ownership, Discovery Sources provider
  ownership and Content Processing storage ownership.
- Added no crawler runtime behavior, adapter implementation or schema change.
- Added Long-tail Discovery Engine to the canonical roadmap as a future
  Research Engine capability, without implementation scope in this PR.
Changed files:
- README.md
- docs/architecture.md
- docs/crawler-worker-model.md
- docs/discovery-sources-model.md
- docs/implementation-order.md
- docs/project-map.md
- docs/progress.md
- docs/url-frontier-model.md
Next step:
- Implement and review Issue #4 Discovery Sources before starting Issue #5
  runtime work.

Date: 2026-07-03
Issue: #41
Status: Review needed
Summary:
- Audited `main`, remote branches, recent pull requests, open GitHub issues,
  documentation and ADRs.
- Confirmed no open pull requests.
- Confirmed `main` contains foundation runtime, Topic Engine implementation
  and approved URL Frontier design.
- Confirmed `issue/4-discovery-sources-design` contains unmerged design-only
  work and must not be treated as canonical until reviewed and merged.
- Added repository audit documentation and a canonical implementation-order
  guide without changing runtime behavior.
- Added `docs/project-map.md` as the repository navigation entry point.
- Added `docs/decisions/README.md` to make ADRs a permanent practice.
- Synchronized this progress tracker with merged work, open branches and newer
  issues #30 and #40-#43.
Changed files:
- README.md
- docs/architecture.md
- docs/codex-workflow.md
- docs/decisions/README.md
- docs/implementation-order.md
- docs/project-map.md
- docs/progress.md
- docs/repository-audit.md
- docs/url-frontier-model.md
Next step:
- Review and merge the Documentation Stabilization PR before continuing
  roadmap implementation.

Date: 2026-06-10
Issue: #4
Status: Review needed
Summary:
- Designed the DiscoveryRun aggregate and resumable lifecycle.
- Defined provider-neutral search, sitemap, seed and extracted-link adapters.
- Defined capability negotiation, checkpoints, retries, backpressure and
  execution budgets.
- Defined the idempotent candidate observation contract with URL Frontier.
- Defined Topic snapshot and future Crawler Worker integration boundaries.
- Added SSRF, DNS rebinding, redirect, XML entity and decompression bomb
  constraints.
- Kept Discovery Sources, Crawler Worker and URL Frontier implementation out of
  scope.
Changed files:
- docs/architecture.md
- docs/codex-workflow.md
- docs/discovery-sources-model.md
- docs/progress.md
- docs/topic-model.md
- docs/url-frontier-model.md
Next step:
- Human architecture review of Issue #4 design. Do not start Issue #5 design
  before approval.

Date: 2026-06-10
Issue: #4
Status: In progress
Summary:
- Created `issue/4-discovery-sources-design` from merged `main`.
- Started design-only work for Discovery Sources.
- Implementation remains deferred until Issue #4 and Issue #5 designs are
  reviewed in sequence.
Changed files:
- docs/progress.md
Next step:
- Define provider contracts, source lifecycles, safety boundaries and URL
  Frontier handoff in `docs/discovery-sources-model.md`.

Date: 2026-06-10
Issue: #2
Status: Done
Summary:
- Human review approved PR #31.
- Reviewed automated feedback before merge and fixed lifecycle/configuration
  write races, private discovery URL validation, strict relevance field
  weights and malformed optional text handling.
- Verified 13 tests and both production builds after review fixes.
- PR #31 merged into `main`.
Changed files:
- packages/topic-engine
- docs/progress.md
Next step:
- Keep Issue #3 at Design approved and begin Issue #4 design only.

Date: 2026-06-10
Issue: #2
Status: Review needed
Summary:
- Implemented the Topic aggregate, lifecycle and bounded configuration
  validation in `packages/topic-engine`.
- Incorporated URL Frontier design adjustments for ignored query parameters,
  cross-host canonical policy, bounded recrawl scheduling, exploratory crawl
  and policy fingerprints.
- Added Knex repositories, PostgreSQL migrations, immutable configuration
  snapshots and optimistic concurrency.
- Added Topic management and lifecycle endpoints to `apps/api`.
- Verified 12 unit tests, both production builds and diff formatting.
- Built and started the complete Docker Compose stack.
- Verified migrations, create, activate, snapshot v1, configuration v2,
  snapshot v2, duplicate slug conflict and stale-version conflict against the
  real API and PostgreSQL.
- Kept URL Frontier, Discovery Sources and crawler behavior out of scope.
Changed files:
- apps/api/src/api.module.ts
- apps/api/src/topics
- packages/topic-engine
- packages/db/src/db.service.ts
- packages/db/src/migrations/001-topic-engine.ts
- package.json
- package-lock.json
- nest-cli.json
- tsconfig.json
- jest.config.js
- README.md
- docs/architecture.md
- docs/topic-model.md
- docs/progress.md
Next step:
- Human implementation review of Issue #2. Do not start Issue #3
  implementation before approval.

Date: 2026-06-10
Issue: #2
Status: In progress
Summary:
- Created `issue/2-topic-engine-implementation` from updated `main`.
- Resumed implementation after URL Frontier design approval.
- Topic contracts will include query normalization, canonical policy,
  recrawl bounds, exploratory relevance and snapshot fingerprints identified
  by Issue #3.
Changed files:
- docs/progress.md
Next step:
- Implement Topic Engine domain, Knex persistence and API, then request review.

Date: 2026-06-10
Issue: #3
Status: Design approved
Summary:
- PR #29 merged into `main`.
- URL Frontier design and its Topic contract adjustments are approved.
- URL Frontier implementation remains deferred until Issue #2 implementation
  review is complete.
Changed files:
- docs/progress.md
Next step:
- Complete and review Topic Engine implementation.

Date: 2026-06-10
Issue: #3
Status: Review needed
Summary:
- Created the dedicated `issue/3-url-frontier-design` branch.
- Designed Frontier identity, candidate and crawl lifecycles.
- Defined normalization, canonicalization and three-stage deduplication.
- Designed priority, relevance, freshness, recrawl and atomic lease models.
- Defined Topic snapshot integration and boundaries with Discovery Sources and
  Crawler Worker.
- Identified Topic contract adjustments to apply when Issue #2 implementation
  resumes.
- Added no URL Frontier, Topic Engine, Discovery Sources or crawler code.
Changed files:
- docs/architecture.md
- docs/progress.md
- docs/topic-model.md
- docs/url-frontier-model.md
Next step:
- Architecture review of `docs/url-frontier-model.md`. Do not implement Topic
  Engine or URL Frontier before this design is approved.

Date: 2026-06-10
Issue: #2
Status: Design approved
Summary:
- PR #27 merged into `main`.
- Topic Engine architecture and ADR 0002 are approved.
- Implementation is intentionally deferred until Issue #3 design review can
  refine Topic snapshot and crawl policy contracts.
Changed files:
- docs/progress.md
Next step:
- Review Issue #3 design, then return to Issue #2 implementation.

Date: 2026-06-10
Issue: #2
Status: Review needed
Summary:
- Architecture review passed.
- Added ADR 0002 for NestJS monorepo boundaries and the planned Knex strategy.
- Added an optional intent profile for future SERP Intelligence and SEO Pack
  generation.
- Rebased the issue branch onto current `main` without carrying stale
  dependency versions.
- No Topic Engine implementation code was added.
Changed files:
- docs/architecture.md
- docs/decisions/0002-nestjs-monorepo-knex.md
- docs/progress.md
- docs/topic-model.md
Next step:
- Merge and review PR #27. Do not start Issue #3 before the PR is merged.

Date: 2026-06-10
Issue: #2
Status: In progress
Summary:
- Created the dedicated `issue/2-topic-engine` branch.
- Designed the Topic aggregate and lifecycle.
- Designed discovery, language/geo, crawl policy and relevance profile models.
- Defined boundaries with URL Frontier, Discovery Sources and Crawler Worker.
- Deferred all implementation until `docs/topic-model.md` receives review.
Changed files:
- docs/architecture.md
- docs/progress.md
- docs/topic-model.md
Next step:
- Complete architecture review of `docs/topic-model.md`.

Date: 2026-06-10
Issue: #1
Status: Done
Summary:
- Human review completed.
- Final review changes use Node.js 24.16.0 LTS and clarify future worker status.
- The complete Compose stack and BullMQ delivery were verified before shutdown.
Changed files:
- .nvmrc
- Dockerfile
- README.md
- docker-compose.yml
- docs/codex-workflow.md
- docs/decisions/0001-foundation.md
- docs/progress.md
- package.json
- package-lock.json
Next step:
- Start Issue #2 design in its dedicated branch.

Date: 2026-06-09
Issue: #1
Status: Review needed
Summary:
- Added CodeRabbit as an automated review gate focused on architecture, best
  practices, performance and security vulnerabilities.
- Added Dependabot coverage for npm, Docker, Docker Compose and GitHub Actions.
- Pinned Node.js 24.16.0 LTS in `.nvmrc`, package engines and container images.
- Clarified that embedding and extraction workers are planned but not part of
  the Issue #1 implementation.
- Added the automated-review-before-human-review workflow and PR checklist.
- Built and started the complete Docker Compose stack successfully.
- Verified API readiness from the host, PostgreSQL 16.14, pgvector 0.8.2,
  Redis PONG, Node.js 24.16.0 in both app containers and a completed BullMQ
  smoke-test job.
- Fixed the API container healthcheck to use IPv4 explicitly after the live
  run exposed Alpine resolving `localhost` to IPv6.
- Added the NestJS monorepo with API and crawler worker applications.
- Added shared common and PostgreSQL packages, BullMQ queue wiring, pgvector and Redis infrastructure.
- Added a dependency-aware API healthcheck, tests, environment template and Docker Compose runtime.
- Documented the foundation architecture in ADR 0001 and updated the architecture overview.
- Verified 4 tests, both production builds, Compose configuration and diff formatting.
- The Compose stack was stopped after successful review validation; its
  PostgreSQL volume was preserved.
Changed files:
- .coderabbit.yaml
- .github/dependabot.yml
- .github/pull_request_template.md
- .nvmrc
- apps/api
- apps/crawler-worker
- packages/common
- packages/db
- infrastructure/docker
- Dockerfile
- docker-compose.yml
- .env.example
- package.json
- package-lock.json
- README.md
- docs/architecture.md
- docs/codex-workflow.md
- docs/decisions/0001-foundation.md
- docs/progress.md
Next step:
- Complete human review of Issue #1.

Date: 2026-06-09
Issue: #1
Status: In progress
Summary:
- Reviewed the architecture and Codex workflow requirements.
- Started the NestJS monorepo and local infrastructure foundation.
Changed files:
- docs/progress.md
Next step:
- Implement the API, crawler worker, shared packages and Docker Compose services.

### Template

```txt
Date: YYYY-MM-DD
Issue: #N
Status: In progress / Design approved / Blocked / Review needed / Done
Summary:
- ...
Changed files:
- ...
Next step:
- ...
```
