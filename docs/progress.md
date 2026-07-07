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
| #3 | URL Frontier: design discovery queue and crawl scheduling | In progress | Initial lifecycle subset is implemented on `main`; remaining observation ingestion, canonical relations and adaptive scheduling are deferred. |
| #41 | Implementation Order and Roadmap Governance | Done | PR #46 merged documentation governance into `main`. |
| #4 | Discovery Sources: design URL discovery providers | Done | PR #50 merged initial package contracts, planner and seed/link adapters into `main`. |
| #5 | Crawler Worker: implement controlled page crawling pipeline | Done | PR #65 merged Architecture Steward cleanup; lifecycle implementation is ready for #6. |
| #6 | Content Processing Pipeline | Done | Initial implementation and close-out stabilization are merged on `main`; Issue #7 may start. |
| #7 | Chunking Engine | Done | Design, foundation implementation and close-out stabilization are complete; Issue #8 may start. |
| #8 | Embedding Pipeline | Done | Design, foundation implementation and close-out stabilization are complete; Issue #9 may start. |
| #9 | Hybrid Retrieval Engine | Done | Design, foundation implementation and close-out stabilization are complete; Issue #10 may start. |
| #10 | Codex Context Pack API | Done | Design, foundation implementation and close-out stabilization are complete; Issue #11 may start. |
| #11 | Entity and Alias Layer | Not started | Can start after #7, integrates with #9/#10. |
| #12 | Ontology and Predicate Registry | Not started | Required before canonical fact extraction. |
| #13 | Fact Extraction Worker | Not started | Depends on #11 and #12. |
| #14 | Knowledge Pack Builder | Not started | Depends on #9, #11, #12, #13. |
| #15 | Source Trust and Evidence Scoring | Not started | Depends on #13/#14 contracts. |
| #16 | SEO Consensus and Conflict Layer | Not started | Depends on #13/#15. |
| #17 | External Entity Enrichment Providers | Not started | Optional enrichment; must be non-blocking. |
| #72 | Demand Engine | Done | Design-only architecture correction merged through PR #73; runtime implementation remains deferred to roadmap order. |
| #18 | SERP Intelligence Layer | Not started | SEO-first layer; required before #30. |
| #30 | SERP Intent Analyzer | Not started | Deferred until #18. |
| #19 | Topic Expansion Engine | Not started | Depends on #18, Demand Engine and knowledge signals. |
| Future issue | Long-tail Discovery Engine | Not started | Future SEO Intelligence capability after Demand Engine, Topic Expansion, Knowledge Graph, SERP and intent signals. |
| #20 | SEO Page Candidate Scoring | Not started | Depends on Demand Engine, #18/#19. |
| #21 | SEO Pack Generator | Not started | Depends on Knowledge Pack, Demand Pack, SERP Pack and SERP Intent Pack. |
| #42 | SEO Agent Gateway | Not started | Deferred until #10, #14, Demand Engine, #18, #21 and #43. |
| #43 | Research Engine Scheduling | Not started | Depends on Topic, Frontier, Discovery and Crawler contracts. |
| #40 | External SEO Data Providers | Not started | Optional enrichment after Demand Engine provider contracts; must never block the core pipeline. |
| #86 | Operator Console | Not started | Internal UI for topics, crawl operations, failures and provider/fallback status; richer version depends on #10 and #43. |

## Active work log

Add entries here in reverse chronological order.

Date: 2026-07-07
Issue: #10
Status: Done
Summary:
- Stabilized the Context Pack API scope after PR #89 merged the foundation.
- Added the optional Research Assets filter to the request contract and made
  the deferred integration explicit through a content gap instead of silently
  ignoring the input.
- Clarified that selected chunks are represented through grouped sections and
  optional raw retrieval debug output.
Changed files:
- docs/context-pack-model.md
- docs/progress.md
- packages/context-pack/src/context-pack.service.ts
- packages/context-pack/src/context-pack.service.spec.ts
- packages/context-pack/src/domain/context-pack-types.ts
Next step:
- Start Issue #11 Entity and Alias Layer from updated `main`.

Date: 2026-07-07
Issue: #10
Status: In progress
Summary:
- Created `issue/10-context-pack-api-foundation` from updated `main` after the
  design-only PR merged.
- Added the initial Context Pack package boundary, request/profile contracts,
  deterministic packaging service and `POST /context-pack` API endpoint.
- Kept text generation, Knowledge Pack Builder, SEO Pack Generator and
  provider-specific prompt formatting out of the implementation.
Changed files:
- README.md
- apps/api/src/api.module.ts
- apps/api/src/context-pack/*
- docs/context-pack-model.md
- docs/progress.md
- docs/project-map.md
- jest.config.js
- nest-cli.json
- packages/context-pack/*
- tsconfig.json
Next step:
- Run targeted tests, full tests and build before opening the foundation PR.

Date: 2026-07-07
Issue: #10
Status: In progress
Summary:
- Started the Context Pack API as a design-only PR from updated `main` after
  Issue #9 closed.
- Added the proposed context pack model covering request DTOs, lightweight query
  normalization, retrieval orchestration, context profiles, deterministic
  packaging, uncertainty reporting and model-agnostic JSON output.
- Kept runtime implementation, text generation, Knowledge Pack Builder and SEO
  Pack Generator out of this design PR.
Changed files:
- README.md
- docs/architecture.md
- docs/context-pack-model.md
- docs/progress.md
- docs/project-map.md
Next step:
- Review and merge the design-only PR before implementing Context Pack API
  runtime code.

Date: 2026-07-07
Issue: #86
Status: Not started
Summary:
- Added Operator Console as a future operations roadmap item.
- Captured the need for a UI to create, pause, archive and reactivate topics,
  manage obsolete crawl work, inspect failures and see degraded provider modes.
- Kept implementation deferred until stable operator APIs exist; richer console
  depends on Context Pack API and Research Engine Scheduling.
Changed files:
- README.md
- docs/implementation-order.md
- docs/operator-console-model.md
- docs/progress.md
- docs/project-map.md
Next step:
- Continue canonical roadmap with Issue #10; revisit #86 when operator API and
  scheduling contracts are stable.

Date: 2026-07-07
Issue: #9
Status: Done
Summary:
- Stabilized the Hybrid Retrieval Engine MVP scope after PR #84 merged the
  foundation.
- Added query-vector and embedding-model inputs plus pgvector search in the
  Knex retrieval repository.
- Kept keyword/metadata degraded mode available when query vectors or
  embeddings are unavailable.
Changed files:
- docs/progress.md
- docs/retrieval-model.md
- packages/retrieval/src/domain/retrieval-types.ts
- packages/retrieval/src/persistence/knex-retrieval.repository.ts
Next step:
- Start Issue #10 Codex Context Pack API from updated `main`.

Date: 2026-07-07
Issue: #9
Status: In progress
Summary:
- Created `issue/9-hybrid-retrieval-foundation` from updated `main` after
  PR #83 merged the design.
- Added the initial Retrieval package boundary, query/result contracts,
  ranking profiles, hybrid ranking, degraded retrieval orchestration,
  deduplication and Knex query layer foundation.
- Added tests for vector-only, keyword fallback, hybrid deduplication and
  explicit metadata fallback.
Changed files:
- README.md
- docs/progress.md
- docs/project-map.md
- docs/retrieval-model.md
- jest.config.js
- nest-cli.json
- packages/retrieval/*
- tsconfig.json
Next step:
- Open and review the foundation implementation PR.

Date: 2026-07-07
Issue: #9
Status: In progress
Summary:
- Started the Hybrid Retrieval Engine as a design-only PR from updated `main`
  after Issue #8 closed.
- Added the proposed retrieval model covering query contracts, vector search,
  keyword search, metadata filters, degraded no-vector mode, ranking profiles,
  score breakdown, deduplication and implementation scope.
- Kept runtime implementation, Context Pack API and entity graph requirements
  out of this design PR.
Changed files:
- README.md
- docs/architecture.md
- docs/progress.md
- docs/project-map.md
- docs/retrieval-model.md
Next step:
- Review and merge the design-only PR before implementing Hybrid Retrieval
  runtime code.

Date: 2026-07-07
Issue: #8
Status: Done
Summary:
- Stabilized the Embedding Pipeline MVP scope after PR #81 merged the
  foundation.
- Added queue dispatch for missing/outdated embedding candidates with batching,
  retry settings and separate embedding-worker execution.
- Added a local embedding provider adapter boundary and stats grouped by model,
  language and status.
- Confirmed the no-provider fallback remains non-blocking and keeps crawler,
  content processing and chunking independent from embedding availability.
Changed files:
- docs/embedding-model.md
- docs/progress.md
- packages/embeddings/src/domain/local-embedding.provider.ts
- packages/embeddings/src/domain/embedding-types.ts
- packages/embeddings/src/embedding-dispatch.service.ts
- packages/embeddings/src/embedding-dispatch.service.spec.ts
- packages/embeddings/src/embedding.module.ts
- packages/embeddings/src/embedding.service.ts
- packages/embeddings/src/embedding.service.spec.ts
- packages/embeddings/src/index.ts
- packages/embeddings/src/persistence/knex-embedding.repository.ts
- packages/embeddings/src/testing/static-embedding.provider.ts
Next step:
- Start Issue #9 Hybrid Retrieval Engine from updated `main`.

Date: 2026-07-07
Issue: #8
Status: In progress
Summary:
- Created `issue/8-embedding-pipeline-foundation` from updated `main` after
  PR #80 merged the design.
- Added the initial Embeddings package boundary, provider abstraction,
  no-provider fallback, candidate selection, idempotent embedding persistence,
  worker app boundary and pgvector storage migration.
- Added tests for idempotency, provider-unavailable fallback, skipped low-value
  chunks and model-version migration.
Changed files:
- README.md
- apps/embedding-worker/*
- docs/embedding-model.md
- docs/progress.md
- docs/project-map.md
- jest.config.js
- nest-cli.json
- package.json
- packages/common/src/queue/queue.constants.ts
- packages/db/src/db.service.ts
- packages/db/src/migrations/006-embedding-foundation.ts
- packages/embeddings/*
- tsconfig.json
Next step:
- Open and review the foundation implementation PR.

Date: 2026-07-07
Issue: #8
Status: In progress
Summary:
- Started the Embedding Pipeline as a design-only PR from updated `main` after
  Issue #7 closed.
- Added the proposed embedding model covering provider abstraction,
  local-first execution, fallback/no-provider behavior, multilingual support,
  candidate selection, queue contracts, pgvector storage, re-embedding and
  quality controls.
- Kept runtime implementation, retrieval ranking and paid provider integration
  out of this design PR.
Changed files:
- README.md
- docs/architecture.md
- docs/embedding-model.md
- docs/progress.md
- docs/project-map.md
Next step:
- Review and merge the design-only PR before implementing Embedding Pipeline
  runtime code.

Date: 2026-07-07
Issue: #7
Status: Done
Summary:
- Stabilized the Chunking Engine MVP scope after PR #78 merged the foundation.
- Preserved source domain and breadcrumb context in chunk source metadata.
- Added explicit tests for table and list preservation in addition to FAQ,
  heading-aware chunks, token limits and hash stability.
- Confirmed vertical-specific chunk labels remain deferred to later entity,
  ontology or vertical-tag layers per the accepted chunking model.
Changed files:
- docs/chunking-model.md
- docs/progress.md
- packages/chunking/src/domain/chunking-types.ts
- packages/chunking/src/domain/semantic-chunker.ts
- packages/chunking/src/domain/semantic-chunker.spec.ts
- packages/chunking/src/testing/chunking.fixture.ts
Next step:
- Start Issue #8 Embedding Pipeline from updated `main`.

Date: 2026-07-07
Issue: #7
Status: In progress
Summary:
- Created `issue/7-chunking-engine-foundation` from updated `main` after PR
  #77 merged the design.
- Added the initial Chunking package boundary, tokenizer abstraction,
  deterministic semantic chunk planner, chunk type classifier, repository
  contract, Knex repository and storage migration.
- Added focused tests for tokenizer behavior, hash stability, heading-aware
  chunks, FAQ preservation, token limits and service idempotency.
- Verified `npm test` and `npm run build`.
Changed files:
- README.md
- docs/chunking-model.md
- docs/project-map.md
- docs/progress.md
- jest.config.js
- nest-cli.json
- packages/chunking/*
- packages/db/src/db.service.ts
- packages/db/src/migrations/005-chunking-foundation.ts
- tsconfig.json
Next step:
- Open and review the foundation implementation PR.

Date: 2026-07-06
Issue: #7
Status: In progress
Summary:
- Started Issue #7 Chunking Engine as a design-only PR from updated `main`.
- Added the proposed chunking model covering document-version inputs,
  heading-aware segmentation, semantic boundaries, tokenizer abstraction,
  chunk profiles, chunk types, metadata preservation, storage proposal and
  implementation scope.
Changed files:
- README.md
- docs/architecture.md
- docs/chunking-model.md
- docs/progress.md
- docs/project-map.md
Next step:
- Review and merge the design-only PR before implementing runtime chunking.

Date: 2026-07-05
Issue: #6, #72
Status: Done
Summary:
- Synchronized progress after PR #73 merged Demand Engine documentation and
  closed GitHub issue #72.
- Marked Issue #6 Content Processing Pipeline as Done after close-out
  stabilization landed on `main` and the repository entered approved
  autonomous execution mode.
- Kept Demand Engine runtime implementation deferred to its roadmap position.
Changed files:
- docs/content-processing-model.md
- docs/demand-engine-model.md
- docs/implementation-order.md
- docs/progress.md
Next step:
- Start Issue #7 Chunking Engine from updated `main`.

Date: 2026-07-05
Issue: #72
Status: Review needed
Summary:
- Added the Demand Engine as a required SEO Intelligence architecture
  boundary for Keyword Discovery and candidate-page discovery.
- Kept the first scope deliberately thin: domain model, provider-optional
  adapter contracts, nullable metrics, confidence/evidence and fallback mode.
- Accepted provider-optional behavior as an architecture decision: paid SEO
  providers improve prioritization but must never block discovery or the core
  pipeline.
- Ran SEO Research Architect / SEO Lead review and addressed sequencing,
  fallback evidence, ownership handoff and candidate-page model findings.
Changed files:
- docs/architecture.md
- docs/demand-engine-model.md
- docs/decisions/0003-demand-engine-provider-optional.md
- docs/implementation-order.md
- docs/progress.md
- docs/project-map.md
- README.md
- docs/AI_COLLABORATION.md
- docs/codex-workflow.md
Next step:
- Open the design-only PR for Issue #72 and complete human review before
  treating the Demand Engine design as merged architecture.

Date: 2026-07-05
Issue: #6
Status: Review needed
Summary:
- Created `issue/6-content-processing-closeout-stabilization` after Issue #6
  close-out review.
- Fixed document version reuse when content changes A -> B -> A by reusing the
  existing matching document version instead of pointing `current_version_id` at
  a generated row that was not inserted.
- Switched manual processing to the tracked processing path so failures for
  existing crawl attempts are recorded in `content_processing_runs`; missing
  crawl attempt IDs remain validation errors because there is no crawl attempt
  row for the processing-run foreign key.
- Added initial deterministic content signal extraction for headings,
  Open Graph, Twitter cards, canonical URL, robots meta, hreflang links,
  published/updated date hints, JSON-LD and bounded microdata structured
  observations, language hints and geo hints.
- Resolved Content Processing model review questions as accepted initial
  decisions.
- Kept chunking, embeddings, retrieval, ontology normalization and automatic
  URL Frontier completion hooks out of Issue #6.
Changed files:
- apps/api/src/content-processing/content-processing.controller.ts
- apps/api/src/content-processing/content-processing.controller.spec.ts
- docs/architecture.md
- docs/content-processing-model.md
- docs/progress.md
- docs/project-map.md
- packages/content-processing/src/content-extraction.ts
- packages/content-processing/src/content-extraction.spec.ts
- packages/content-processing/src/content-processing.service.ts
- packages/content-processing/src/content-processing.service.spec.ts
- packages/content-processing/src/domain/content-processing-types.ts
- packages/content-processing/src/domain/content-processing-types.spec.ts
- packages/content-processing/src/domain/document-versioning.ts
- packages/content-processing/src/domain/document-versioning.spec.ts
- packages/content-processing/src/index.ts
- packages/content-processing/src/persistence/knex-content-processing.repository.ts
Next step:
- Review this stabilization PR. If accepted, keep #6 in `Review needed` until
  human review is complete, then move to `Done` and start Chunking Engine (#7).

Date: 2026-07-05
Issue: #6
Status: In progress
Summary:
- Merged PR #69 into `main`.
- Created `issue/6-content-processing-worker` from updated `main`.
- Added the `content-processing` BullMQ queue contract.
- Added `ContentProcessingDispatchService` to enqueue bounded batches of
  pending successful crawl attempts with crawl attempt IDs as BullMQ job IDs
  after recording durable `pending` processing state.
- Added `POST /content-processing/dispatch` for bounded operator-triggered
  async dispatch.
- Added `ContentProcessingProcessor` to the crawler worker app to process
  queued content jobs through the idempotent service boundary with durable
  `processing` and failure state recording.
- Kept automatic URL Frontier completion hooks, chunking, embeddings and
  retrieval out of this slice.
Changed files:
- apps/api/src/content-processing/content-processing.controller.ts
- apps/api/src/content-processing/content-processing.controller.spec.ts
- apps/crawler-worker/src/content-processing.processor.ts
- apps/crawler-worker/src/content-processing.processor.spec.ts
- apps/crawler-worker/src/crawler-worker.module.ts
- docs/content-processing-model.md
- docs/progress.md
- docs/project-map.md
- packages/common/src/queue/queue.constants.ts
- packages/content-processing/src/content-processing-dispatch.service.ts
- packages/content-processing/src/content-processing-dispatch.service.spec.ts
- packages/content-processing/src/content-processing.module.ts
- packages/content-processing/src/domain/content-processing-types.ts
- packages/content-processing/src/index.ts
- packages/content-processing/src/persistence/knex-content-processing.repository.ts
Next step:
- Review whether Issue #6 needs explicit failure status recording before
  closing the Content Processing Pipeline and starting Chunking Engine (#7).

Date: 2026-07-05
Issue: #6
Status: In progress
Summary:
- Merged PR #68 into `main`.
- Created `issue/6-content-processing-api` from updated `main`.
- Added `processCrawlAttemptById()` to load successful crawl attempts through
  the Content Processing repository boundary.
- Added manual API endpoint `POST /content-processing/process` for bounded
  operator-triggered processing by crawl attempt ID.
- Wired `ContentProcessingModule` and `ContentProcessingController` into the
  API application.
- Kept worker orchestration, batch processing, chunking, embeddings and
  retrieval out of this slice.
Changed files:
- README.md
- apps/api/src/api.module.ts
- apps/api/src/content-processing/content-processing.controller.ts
- apps/api/src/content-processing/content-processing.controller.spec.ts
- docs/progress.md
- docs/project-map.md
- packages/content-processing/src/content-processing.service.ts
- packages/content-processing/src/content-processing.service.spec.ts
- packages/content-processing/src/domain/content-processing-types.ts
- packages/content-processing/src/persistence/knex-content-processing.repository.ts
Next step:
- Add worker orchestration for pending/successful crawl attempts after this API
  slice is reviewed.

Date: 2026-07-04
Issue: #6
Status: In progress
Summary:
- Merged PR #67 into `main`.
- Created `issue/6-content-processing-service` from updated `main`.
- Added `ContentProcessingService` for idempotent processing of successful
  crawl attempts.
- Added a Knex-backed Content Processing repository that creates or reuses
  topic/frontier documents, creates immutable document versions and records
  duplicate processing as `skipped_duplicate`.
- Registered the service and repository in `ContentProcessingModule`.
- Kept manual API, worker orchestration, chunking, embeddings and retrieval out
  of this slice.
Changed files:
- docs/progress.md
- docs/project-map.md
- packages/content-processing/src/content-processing.module.ts
- packages/content-processing/src/content-processing.service.ts
- packages/content-processing/src/content-processing.service.spec.ts
- packages/content-processing/src/content-processing.tokens.ts
- packages/content-processing/src/domain/content-processing-types.ts
- packages/content-processing/src/index.ts
- packages/content-processing/src/persistence/knex-content-processing.repository.ts
- packages/content-processing/src/persistence/knex-content-processing.repository.spec.ts
Next step:
- Add a manual processing trigger/API after this service slice is reviewed.

Date: 2026-07-04
Issue: #6
Status: In progress
Summary:
- Merged design-only PR #66 into `main`.
- Created `issue/6-content-processing-foundation` from updated `main`.
- Added the initial `packages/content-processing` boundary with domain
  contracts for documents, document versions and processing records.
- Added the `004-content-processing-foundation` migration for `documents`,
  `document_versions` and `content_processing_runs`.
- Registered the Content Processing package in Nest, TypeScript and Jest
  project configuration.
- Kept processing service logic, manual trigger/API, worker orchestration,
  chunking, embeddings and retrieval out of this slice.
Changed files:
- docs/architecture.md
- docs/progress.md
- docs/project-map.md
- jest.config.js
- nest-cli.json
- packages/content-processing
- packages/db/src/db.service.ts
- packages/db/src/migrations/004-content-processing-foundation.ts
- tsconfig.json
Next step:
- Add an idempotent Content Processing service for successful crawl attempts
  after this foundation slice is reviewed.

Date: 2026-07-04
Issue: #6
Status: Review needed
Summary:
- Merged PR #65 into `main`.
- Started Issue #6 Content Processing Pipeline as a design-only PR.
- Added `docs/content-processing-model.md` to define pipeline purpose,
  ownership, inputs, outputs, document identity, versioning, artifact strategy,
  normalization, metadata extraction, processing state, idempotency and
  downstream contracts.
- Kept runtime code, migrations, workers and APIs out of this slice.
Changed files:
- docs/architecture.md
- docs/content-processing-model.md
- docs/progress.md
- docs/project-map.md
Next step:
- Review and approve the Content Processing design before implementation.

Date: 2026-07-04
Issue: #5
Status: Review needed
Summary:
- Ran Architecture Steward review after PR #64 merged.
- Identified ownership drift where URL Frontier completion scheduling lived in
  the Crawler package.
- Moved crawl attempt persistence, completion status mapping, retry backoff and
  success recrawl scheduling behind a URL Frontier-owned completion service.
- Kept the Crawler result sink as a thin adapter that delegates normalized crawl
  results to the URL Frontier boundary.
- Synchronized roadmap, architecture, URL Frontier, Crawler Worker, project map
  and progress documentation with the implemented lifecycle subset.
- Documented remaining URL Frontier work as observation ingestion, canonical
  relations, configurable retry policy, jitter and adaptive recrawl adjustment.
Changed files:
- docs/architecture.md
- docs/crawler-worker-model.md
- docs/implementation-order.md
- docs/progress.md
- docs/project-map.md
- docs/repository-audit.md
- docs/url-frontier-model.md
- packages/crawler/src/crawler.module.ts
- packages/crawler/src/infrastructure/knex-crawl-attempt-result-sink.ts
- packages/crawler/src/infrastructure/knex-crawl-attempt-result-sink.spec.ts
- packages/url-frontier/src/application/url-frontier-completion.service.ts
- packages/url-frontier/src/application/url-frontier-completion.service.spec.ts
- packages/url-frontier/src/domain/url-frontier-types.ts
- packages/url-frontier/src/index.ts
- packages/url-frontier/src/persistence/knex-url-frontier.repository.ts
- packages/url-frontier/src/url-frontier.module.ts
Next step:
- Review and merge this cleanup before starting Content Processing Pipeline
  (#6).

Date: 2026-07-04
Issue: #5
Status: In progress
Summary:
- Merged PR #64 into `main`.
- Created `issue/3-url-frontier-success-recrawl` from updated `main`.
- Added success recrawl scheduling at the URL Frontier completion boundary.
- Successful crawl completion now sets `last_crawled_at`, resets consecutive
  failures and schedules `next_crawl_at` from the crawl policy recrawl
  interval bounded by min/max recrawl limits.
- Preserved recrawl policy fields in `CrawlPolicySnapshot` command
  normalization.
- Made `succeeded` URL Frontier entries eligible for future leasing once
  `next_crawl_at` is due.
- Kept adaptive change-frequency recrawl adjustment and per-topic retry
  customization out of this slice.
Changed files:
- docs/crawler-worker-model.md
- docs/progress.md
- docs/project-map.md
- docs/url-frontier-model.md
- packages/crawler/src/domain/crawl-command.spec.ts
- packages/crawler/src/domain/crawl-command.ts
- packages/crawler/src/domain/crawler-types.ts
- packages/crawler/src/infrastructure/knex-crawl-attempt-result-sink.ts
- packages/crawler/src/infrastructure/knex-crawl-attempt-result-sink.spec.ts
- packages/url-frontier/src/persistence/knex-url-frontier.repository.ts
Next step:
- Run Architecture Steward review for Issue #5 lifecycle progress before
  moving to Content Processing Pipeline (#6).

Date: 2026-07-04
Issue: #5
Status: In progress
Summary:
- Merged PR #62 into `main`.
- Created `issue/3-url-frontier-backoff-scheduling` from updated `main`.
- Added bounded exponential retry scheduling to URL Frontier completion
  feedback for retryable and timed-out crawl results.
- Retryable completion now schedules `next_crawl_at` after a bounded backoff
  delay instead of immediately retrying.
- Exhausted consecutive failure budgets now complete the frontier entry as
  `failed_terminal`.
- Kept configurable retry policies, jitter and success recrawl scheduling out
  of this slice.
Changed files:
- docs/crawler-worker-model.md
- docs/progress.md
- docs/project-map.md
- docs/url-frontier-model.md
- packages/crawler/src/infrastructure/knex-crawl-attempt-result-sink.ts
- packages/crawler/src/infrastructure/knex-crawl-attempt-result-sink.spec.ts
Next step:
- Add success recrawl scheduling once Topic recrawl policy integration is
  introduced at the URL Frontier completion boundary.

Date: 2026-07-04
Issue: #5
Status: In progress
Summary:
- Merged PR #61 into `main`.
- Created `issue/3-url-frontier-completion-feedback` from updated `main`.
- Extended the Knex crawl result sink so result persistence and URL Frontier
  completion feedback happen in one transaction.
- Added compare-and-set completion by `frontierEntryId` and `attemptId` so
  stale attempt results cannot complete a different active lease.
- Updates `url_frontier_entries` to `succeeded`, `failed_retryable` or
  `failed_terminal` and clears active lease fields after completion.
- Retryable/timed-out results schedule an immediate retry by setting
  `next_crawl_at` to completion time; exponential backoff remains future work.
Changed files:
- docs/progress.md
- docs/url-frontier-model.md
- packages/crawler/src/infrastructure/knex-crawl-attempt-result-sink.ts
- packages/crawler/src/infrastructure/knex-crawl-attempt-result-sink.spec.ts
- packages/url-frontier/src/persistence/knex-url-frontier.repository.ts
Next step:
- Add bounded retry/backoff scheduling rules for URL Frontier completion.

Date: 2026-07-04
Issue: #5
Status: In progress
Summary:
- Merged PR #60 into `main`.
- Created `issue/3-url-frontier-dispatch-api` from updated `main`.
- Added bounded `dispatchBatch()` orchestration on top of the single-entry URL
  Frontier dispatch boundary.
- Added manual API endpoint `POST /url-frontier/dispatch` for bounded dispatch
  runs with request validation and defaults.
- Wired `UrlFrontierModule` into the API application.
- Kept recurring scheduler loops, Research Engine budget policy and Discovery
  Sources ingestion out of this slice.
Changed files:
- README.md
- apps/api/src/api.module.ts
- apps/api/src/url-frontier/url-frontier-dispatch.controller.ts
- apps/api/src/url-frontier/url-frontier-dispatch.controller.spec.ts
- docs/progress.md
- docs/url-frontier-model.md
- packages/url-frontier/src/application/url-frontier-dispatch.service.ts
- packages/url-frontier/src/application/url-frontier-dispatch.service.spec.ts
Next step:
- Add completion feedback from Crawler Worker results back into URL Frontier
  entry status and recrawl scheduling.

Date: 2026-07-04
Issue: #5
Status: In progress
Summary:
- Merged PR #59 into `main`.
- Created `issue/3-url-frontier-bullmq-dispatch` from updated `main`.
- Added URL Frontier dispatch service that leases one eligible entry and
  publishes the leased crawl command to the BullMQ crawl queue.
- Uses `attemptId` as BullMQ `jobId` so leased retries remain idempotent at the
  transport boundary.
- Registered dispatch service in `UrlFrontierModule` without adding a scheduler
  loop or API endpoint.
- Kept Discovery Sources ingestion, scheduling backoff and recurring dispatcher
  orchestration out of this slice.
Changed files:
- docs/progress.md
- docs/url-frontier-model.md
- packages/url-frontier/src/application/url-frontier-dispatch.service.ts
- packages/url-frontier/src/application/url-frontier-dispatch.service.spec.ts
- packages/url-frontier/src/index.ts
- packages/url-frontier/src/url-frontier.module.ts
- packages/url-frontier/src/url-frontier.tokens.ts
Next step:
- Add scheduler/API orchestration that calls the dispatch service within bounded
  crawl budgets.

Date: 2026-07-04
Issue: #5
Status: In progress
Summary:
- Merged PR #58 into `main`.
- Created `issue/3-url-frontier-lease-lifecycle` from updated `main`.
- Added the first `packages/url-frontier` boundary with repository contracts and
  a NestJS module.
- Added `url_frontier_entries` migration for topic-scoped normalized URL
  identity, scheduling state and lease ownership.
- Added a Knex-backed URL Frontier repository with idempotent entry upsert,
  atomic `leaseNext()` selection using `FOR UPDATE SKIP LOCKED`, expired lease
  recovery and `acknowledgeCrawling()`.
- Kept Discovery Sources ingestion, canonical relations, scheduling backoff and
  BullMQ dispatch out of this slice.
Changed files:
- docs/architecture.md
- docs/project-map.md
- docs/progress.md
- docs/url-frontier-model.md
- jest.config.js
- nest-cli.json
- README.md
- packages/db/src/db.service.ts
- packages/db/src/migrations/003-url-frontier-entries.ts
- packages/url-frontier
- tsconfig.json
Next step:
- Wire URL Frontier leasing to BullMQ dispatch after repository review.

Date: 2026-07-04
Issue: #5
Status: In progress
Summary:
- Merged PR #57 into `main`.
- Created `issue/3-url-frontier-crawl-attempt-sink` from updated `main`.
- Added the first URL Frontier-owned `crawl_attempts` migration for durable
  normalized crawl attempt results.
- Added a Knex-backed crawl result sink with idempotent upsert by `attempt_id`
  for BullMQ retry safety.
- Switched `CrawlerModule` default `CRAWL_RESULT_SINK` from in-memory to the
  Knex-backed crawl attempt sink.
- Kept full URL Frontier entries, leasing, scheduling and backoff out of this
  slice.
Changed files:
- docs/crawler-worker-model.md
- docs/progress.md
- packages/crawler/src/crawler.module.ts
- packages/crawler/src/index.ts
- packages/crawler/src/infrastructure/knex-crawl-attempt-result-sink.ts
- packages/crawler/src/infrastructure/knex-crawl-attempt-result-sink.spec.ts
- packages/db/src/db.service.ts
- packages/db/src/migrations/002-url-frontier-crawl-attempts.ts
Next step:
- Add URL Frontier entries and lease lifecycle implementation after this sink is
  reviewed.

Date: 2026-07-03
Issue: #5
Status: In progress
Summary:
- Merged PR #56 into `main`.
- Created `issue/5-crawler-result-sink-ack` from updated `main`.
- Added an injectable crawl result sink boundary and wired `CrawlJobHandler` to
  append every normalized result before returning to the BullMQ processor.
- Added the current self-contained in-memory result sink implementation.
- Preserved BullMQ acknowledgement semantics: sink or handler failures propagate
  so the job is not acknowledged as successful.
- Kept URL Frontier-owned durable attempt persistence and schema design out of
  this slice.
Changed files:
- apps/crawler-worker/src/crawl.processor.spec.ts
- docs/crawler-worker-model.md
- docs/progress.md
- packages/crawler/src/crawl-job.handler.ts
- packages/crawler/src/crawl-job.handler.spec.ts
- packages/crawler/src/crawler.module.ts
- packages/crawler/src/index.ts
- packages/crawler/src/infrastructure/in-memory-crawl-result-sink.ts
- packages/crawler/src/infrastructure/in-memory-crawl-result-sink.spec.ts
Next step:
- Add a durable URL Frontier-owned crawl attempt/result sink once the Frontier
  persistence schema is accepted.

Date: 2026-07-03
Issue: #5
Status: In progress
Summary:
- Merged PR #55 into `main`.
- Created `issue/5-crawler-http-fetch-adapter` from updated `main`.
- Added the first concrete `http-fetch` crawler adapter for static HTML fetches.
- Wired `CrawlJobHandler` to select and execute configured adapters only after
  `CrawlExecutionWrapper` returns a ready execution context.
- Kept all adapter network access behind `SafeNetworkGateway`.
- Added minimal static HTML extraction for title, meta description, canonical
  URL, plain text and outgoing links.
- Rechecked Topic policy after redirects before accepting fetched content.
Changed files:
- docs/crawler-worker-model.md
- docs/progress.md
- packages/crawler/src/crawl-job.handler.ts
- packages/crawler/src/crawl-job.handler.spec.ts
- packages/crawler/src/crawler.module.ts
- packages/crawler/src/index.ts
- packages/crawler/src/infrastructure/http-fetch-adapter.ts
- packages/crawler/src/infrastructure/http-fetch-adapter.spec.ts
Next step:
- Add crawl result sink persistence and worker job acknowledgement behavior.

Date: 2026-07-03
Issue: #5
Status: In progress
Summary:
- Merged PR #54 into `main`.
- Created `issue/5-crawler-execution-wrapper` from updated `main`.
- Added worker execution wrapper that prepares crawl execution context using
  deadline, Topic policy, robots policy and Safe Network Gateway.
- Connected `CrawlJobHandler` to the wrapper so policy failures return
  normalized blocked/timed-out crawl results before adapter execution.
- Kept concrete crawler adapters disabled.
Changed files:
- docs/crawler-worker-model.md
- docs/progress.md
- packages/crawler/src/crawl-execution-wrapper.ts
- packages/crawler/src/crawl-execution-wrapper.spec.ts
- packages/crawler/src/crawl-job.handler.ts
- packages/crawler/src/crawl-job.handler.spec.ts
- packages/crawler/src/crawler.module.ts
- packages/crawler/src/domain/crawler-types.ts
- packages/crawler/src/index.ts
Next step:
- Add the first concrete adapter, likely `http-fetch`, using the prepared
  execution context.

Date: 2026-07-03
Issue: #5
Status: In progress
Summary:
- Created `issue/5-crawler-topic-policy` from updated `main` after PR #53
  merge.
- Added pure Topic crawl policy evaluator for Crawler Worker request, redirect
  and canonical candidates.
- Enforced allowed hosts, denied hosts, included path patterns, excluded path
  patterns and cross-host canonical policy.
- Kept concrete crawler adapters and adapter execution disabled.
Changed files:
- docs/crawler-worker-model.md
- docs/progress.md
- packages/crawler/src/domain/crawl-command.ts
- packages/crawler/src/domain/crawl-command.spec.ts
- packages/crawler/src/domain/crawler-types.ts
- packages/crawler/src/domain/topic-policy.ts
- packages/crawler/src/domain/topic-policy.spec.ts
- packages/crawler/src/index.ts
Next step:
- Add worker execution wrapper that combines safe network gateway, robots
  policy, Topic policy and deadline enforcement before enabling adapters.

Date: 2026-07-03
Issue: #5
Status: In progress
Summary:
- Created `issue/5-crawler-robots-policy` from updated `main` after PR #52
  merge.
- Added robots policy service that fetches robots files through the safe network
  gateway.
- Added cache keys based on scheme, authority and user-agent.
- Added fail-closed default behavior with explicit fail-open configuration.
- Added basic User-agent, Allow, Disallow and Crawl-delay parsing.
- Kept concrete crawler adapters and adapter execution disabled.
Changed files:
- docs/crawler-worker-model.md
- docs/progress.md
- packages/crawler/src/domain/crawler-types.ts
- packages/crawler/src/infrastructure/robots-policy.service.ts
- packages/crawler/src/infrastructure/robots-policy.service.spec.ts
- packages/crawler/src/crawler.module.ts
- packages/crawler/src/index.ts
Next step:
- Add Topic host/path redirect policy enforcement before enabling concrete
  adapter execution.

Date: 2026-07-03
Issue: #5
Status: In progress
Summary:
- Created `issue/5-crawler-safe-network-gateway` from updated `main` after
  PR #51 merge.
- Added safe network gateway implementation for structural URL validation,
  HTTP(S)-only requests, DNS/IP public-route checks, manual redirect limits,
  bounded response headers/body and deadline-aware abort signals.
- Kept concrete crawler adapters and adapter execution disabled.
- Added focused tests using fake DNS and fake fetch; no real network requests
  are required by unit tests.
Changed files:
- docs/crawler-worker-model.md
- docs/progress.md
- packages/crawler/src/domain/crawler-errors.ts
- packages/crawler/src/domain/crawler-types.ts
- packages/crawler/src/domain/deadline-signal.ts
- packages/crawler/src/infrastructure/safe-network-gateway.service.ts
- packages/crawler/src/crawler.module.ts
- packages/crawler/src/index.ts
Next step:
- Add robots policy service and Topic host/path redirect policy enforcement
  before enabling concrete adapter execution.

Date: 2026-07-03
Issue: #5
Status: In progress
Summary:
- Created `issue/5-crawler-worker-implementation` from updated `main` after
  PR #50 merge.
- Synchronized Issue #4 to Done after merge.
- Started Crawler Worker implementation from the accepted design in
  `docs/crawler-worker-model.md`.
- Added `packages/crawler` with command validation, adapter contracts, safe
  network gateway contract, adapter selection and crawl result normalization.
- Wired `apps/crawler-worker` to the crawler command handler without adding
  network crawling, concrete adapters or adapter execution.
- Added focused unit tests for command validation, adapter selection, result
  normalization, bounded collections and disabled-adapter handling.
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
