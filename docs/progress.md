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
| #2 | Topic Engine: design topic definitions and crawl configuration model | Done | PR #31 merged into `main`; GitHub issue is closed. |
| #3 | URL Frontier: design discovery queue and crawl scheduling | In progress | Initial lifecycle subset is implemented on `main`; remaining observation ingestion, canonical relations and adaptive scheduling are deferred. |
| #41 | Implementation Order and Roadmap Governance | Done | PR #46 merged documentation governance into `main`. |
| #4 | Discovery Sources: design URL discovery providers | Done | PR #50 merged initial package contracts, planner and seed/link adapters into `main`. |
| #5 | Crawler Worker: implement controlled page crawling pipeline | Done | PR #65 merged Architecture Steward cleanup; lifecycle implementation is ready for #6. |
| #6 | Content Processing Pipeline | Done | Initial implementation and close-out stabilization are merged on `main`; Issue #7 may start. |
| #7 | Chunking Engine | Done | Design, foundation implementation and close-out stabilization are complete; Issue #8 may start. |
| #8 | Embedding Pipeline | Done | Design, foundation implementation and close-out stabilization are complete; Issue #9 may start. |
| #9 | Hybrid Retrieval Engine | Done | Design, foundation implementation and close-out stabilization are complete; Issue #10 may start. |
| #10 | Codex Context Pack API | Done | Design, foundation implementation and close-out stabilization are complete; Issue #11 may start. |
| #11 | Entity and Alias Layer | Done | Design, foundation implementation and close-out stabilization are complete; Issue #12 may start. |
| #12 | Ontology and Predicate Registry | Done | Design, foundation implementation and close-out stabilization are complete; Issue #28 may start. |
| #28 | Topic Classification Strategy | Done | PR #105 merged the design/contract; runtime storage remains deferred until a consumer needs it. |
| #13 | Fact Extraction Worker | Done | PR #109 merged worker queue orchestration and closed Issue #13; Issue #14 may start. |
| #14 | Knowledge Pack Builder | Done | Design, foundation implementation, safe opt-in Context Pack bridge and close-out synchronization are complete; Issue #15 may start. |
| #15 | Source Trust and Evidence Scoring | Done | Design, foundation implementation, safe Knowledge Pack score consumption and close-out synchronization are complete; Issue #16 may start. |
| #16 | SEO Consensus and Conflict Layer | Done | Design, foundation implementation, safe Knowledge Pack consensus consumption and close-out synchronization are complete; roadmap continues with #98. |
| #17 | External Entity Enrichment Providers | Not started | Optional enrichment; must be non-blocking. |
| #72 | Demand Engine Design | Done | Design-only architecture correction merged through PR #73. Runtime implementation is tracked by #98. |
| #98 | Demand Engine Runtime | Done | Provider-optional runtime foundation, fallback discovery and nullable metrics are complete; Issue #18 may start. |
| #18 | SERP Intelligence Layer | Done | Design, foundation implementation, repository abstraction and close-out synchronization are complete; Issue #30 may start. |
| #30 | SERP Intent Analyzer | Done | Design, foundation implementation, repository abstraction and close-out synchronization are complete; Issue #19 may start. |
| #19 | Topic Expansion Engine | Done | Design, foundation implementation, repository abstraction and close-out synchronization are complete; Issue #134 may start. |
| #134 | Long-tail Discovery Engine | Done | Design, foundation implementation, repository abstraction and close-out synchronization are complete; Issue #20 may start. |
| #20 | SEO Page Candidate Scoring | Done | Design, foundation implementation, repository abstraction and close-out synchronization are complete; Issue #21 may start. |
| #21 | SEO Pack Generator | Review needed | Foundation PR adds model-agnostic SEO Pack contracts, deterministic assembly services and repository abstraction. |
| #42 | SEO Agent Gateway | Not started | Deferred until #10, #14, Demand Engine Runtime, #18, #21 and #43. |
| #43 | Research Engine Scheduling | Not started | Depends on Topic, Frontier, Discovery and Crawler contracts. |
| #40 | External SEO Data Providers | Not started | Optional enrichment after #98 Demand Engine Runtime provider contracts; must never block the core pipeline. |
| #86 | Operator Console | Not started | Internal UI for topics, crawl operations, failures and provider/fallback status; richer version depends on #10 and #43. |

## Active work log

Add entries here in reverse chronological order.

Date: 2026-07-23
Issue: #21
Status: Review needed
Summary:
- Added `packages/seo-pack` as the runtime foundation for SEO Pack Generator.
- Implemented model-agnostic SEO Pack contracts, deterministic page brief,
  outline, FAQ, required evidence, SERP requirement, internal linking hint and
  generation constraint assembly.
- Kept content generation, prompt rendering, SEO Agent Gateway runtime,
  operator UI, concrete persistence, scheduling, paid provider integrations,
  automatic publishing and rank tracking out of scope.
Changed files:
- nest-cli.json
- tsconfig.json
- jest.config.js
- docs/progress.md
- docs/project-map.md
- docs/seo-pack-generator-model.md
- packages/seo-pack/**
Validation:
- npm test -- --runTestsByPath packages/seo-pack/src/seo-pack.service.spec.ts packages/seo-pack/src/persistence/seo-pack.repository.spec.ts
- ./node_modules/.bin/tsc -p packages/seo-pack/tsconfig.lib.json --noEmit
- ./node_modules/.bin/nest build seo-pack
- npm test
- git diff --check
Next step:
- Review and merge the foundation before close-out stabilization for Issue
  #21.

Date: 2026-07-23
Issue: #21
Status: Review needed
Summary:
- Started SEO Pack Generator as a design-only PR after Issue #20 closed.
- Defined SEO Pack boundaries, inputs, outputs, page brief structure,
  recommended outline sections, FAQ recommendations, required entities/facts,
  SERP intent requirements, internal linking hints, uncertainty metadata and
  consumer boundaries.
- Kept runtime implementation, content generation, prompt generation,
  automatic publishing, scheduling, operator UI and provider integrations out
  of the design PR scope.
Changed files:
- docs/architecture.md
- docs/codex-workflow.md
- docs/progress.md
- docs/project-map.md
- docs/seo-pack-generator-model.md
Validation:
- git diff --check
- Architecture Steward review: no blockers; clarified Context Pack vs SEO Pack,
  SEO Agent Gateway as the integration boundary and Codex-facing ownership.
Next step:
- Review and merge the design before implementing `packages/seo-pack`.

Date: 2026-07-23
Issue: #20
Status: Done
Summary:
- Closed out SEO Page Candidate Scoring after design and foundation
  implementation merged.
- Confirmed scored candidate contracts, scoring signal normalization,
  deterministic profiles, opportunity score/band/confidence calculation,
  rationale metadata, non-blocking Focused Research hints, page type hints and
  repository abstraction satisfy the accepted Issue #20 scope.
- Confirmed paid provider integrations, concrete persistence, operator UI, SEO
  Pack generation, content generation, automatic publish decisions and rank
  tracking remain later roadmap work.
Changed files:
- docs/implementation-order.md
- docs/progress.md
- docs/seo-page-candidate-scoring-model.md
Validation:
- git diff --check
Next step:
- Close GitHub Issue #20 and start Issue #21 SEO Pack Generator from updated
  `main`.

Date: 2026-07-23
Issue: #20
Status: Review needed
Summary:
- Added `packages/seo-candidate-scoring` as the runtime foundation for SEO Page
  Candidate Scoring.
- Implemented scoring signal contracts, deterministic profile weights,
  opportunity score/band/confidence calculation, rationale metadata,
  non-blocking Focused Research hints, recommended page type hints and
  repository abstraction.
- Kept paid provider integrations, concrete persistence, operator UI, SEO Pack
  generation, content generation, automatic publish decisions and rank tracking
  out of scope.
Changed files:
- nest-cli.json
- tsconfig.json
- jest.config.js
- docs/progress.md
- docs/project-map.md
- docs/seo-page-candidate-scoring-model.md
- packages/seo-candidate-scoring/**
Validation:
- npm test
- npm test -- --runTestsByPath packages/seo-candidate-scoring/src/candidate-scoring-pack.service.spec.ts packages/seo-candidate-scoring/src/persistence/seo-candidate-scoring.repository.spec.ts
- ./node_modules/.bin/tsc -p packages/seo-candidate-scoring/tsconfig.lib.json --noEmit
- ./node_modules/.bin/nest build seo-candidate-scoring
- git diff --check
Next step:
- Review and merge the foundation before close-out stabilization for Issue
  #20.

Date: 2026-07-23
Issue: #20
Status: Review needed
Summary:
- Started SEO Page Candidate Scoring as a design-only PR after Issue #134
  closed.
- Defined scoring signals, scoring profiles, opportunity score output,
  confidence/rationale metadata, recommended page type hints and Focused
  Research hints.
- Kept paid provider integrations, concrete persistence, operator UI, SEO Pack
  generation, content generation, automatic publish decisions and rank tracking
  out of the Issue #20 MVP scope.
Changed files:
- docs/architecture.md
- docs/progress.md
- docs/project-map.md
- docs/seo-page-candidate-scoring-model.md
Validation:
- git diff --check
- Architecture Steward review: no blocker; synchronized #21 dependency on #20
  scored candidate outputs and constrained topic-authority signals to
  candidate-level prioritization evidence.
Next step:
- Merge design before implementing `packages/seo-candidate-scoring`.

Date: 2026-07-23
Issue: #134
Status: Done
Summary:
- Closed out Long-tail Discovery Engine after design and foundation
  implementation merged.
- Confirmed Long-tail Discovery Pack contracts, dimension extraction,
  explicit combination rules, compatibility/co-occurrence safeguards, bounded
  candidate generation, opportunity trees, provider-optional nullable metrics
  and repository abstraction satisfy the accepted Issue #134 scope.
- Confirmed paid provider integrations, concrete persistence, recursive
  expansion, SEO Page Candidate Scoring, SEO Pack generation, content
  generation and UI remain later roadmap work.
Changed files:
- docs/implementation-order.md
- docs/progress.md
- docs/long-tail-discovery-model.md
Validation:
- git diff --check
Next step:
- Close GitHub Issue #134 and start Issue #20 SEO Page Candidate Scoring from
  updated `main`.

Date: 2026-07-23
Issue: #134
Status: Review needed
Summary:
- Added `packages/long-tail-discovery` as the runtime foundation for Long-tail
  Discovery Engine.
- Implemented dimension contracts, explicit combination rules,
  compatibility/co-occurrence safeguards, bounded candidate generation,
  opportunity tree assembly, provider-optional nullable metrics and repository
  abstraction.
- Kept paid provider integrations, concrete persistence, recursive expansion,
  SEO Page Candidate Scoring, SEO Pack generation, content generation and UI
  out of scope.
Changed files:
- nest-cli.json
- tsconfig.json
- jest.config.js
- docs/progress.md
- docs/project-map.md
- docs/long-tail-discovery-model.md
- packages/long-tail-discovery/**
Validation:
- npm test
- npm test -- --runTestsByPath packages/long-tail-discovery/src/long-tail-discovery-pack.service.spec.ts packages/long-tail-discovery/src/persistence/long-tail-discovery.repository.spec.ts
- ./node_modules/.bin/tsc -p packages/long-tail-discovery/tsconfig.lib.json --noEmit
- ./node_modules/.bin/nest build long-tail-discovery
- git diff --check
Next step:
- Review and merge the foundation before close-out stabilization for Issue
  #134.

Date: 2026-07-23
Issue: #134
Status: Review needed
Summary:
- Started Long-tail Discovery Engine as a design-only PR after Issue #19
  closed and the roadmap placeholder was synchronized to Issue #134.
- Defined dimension contracts, explicit combination rules, bounded candidate
  generation, opportunity trees and Long-tail Discovery Pack contracts.
- Kept paid provider integrations, concrete persistence, recursive expansion,
  SEO Page Candidate Scoring, SEO Pack generation, content generation and UI
  out of the Issue #134 MVP scope.
Changed files:
- docs/architecture.md
- docs/progress.md
- docs/project-map.md
- docs/long-tail-discovery-model.md
Validation:
- git diff --check
- Architecture Steward review: tightened combination-level evidence
  safeguards, Knowledge Pack pipeline ordering, #20 dependency wording and
  downstream ownership of `promoted` status.
Next step:
- Merge design before implementing `packages/long-tail-discovery`.

Date: 2026-07-23
Issue: #134
Status: Not started
Summary:
- Created GitHub Issue #134 for the Long-tail Discovery Engine roadmap item
  that was previously tracked as `Future issue`.
- Synchronized canonical roadmap and progress tracking to reference the real
  issue number before starting design or implementation work.
Changed files:
- docs/implementation-order.md
- docs/progress.md
Validation:
- git diff --check
Next step:
- Start Issue #134 Long-tail Discovery Engine design from updated `main`.

Date: 2026-07-23
Issue: #19
Status: Done
Summary:
- Closed out Topic Expansion Engine after design and foundation implementation
  merged.
- Confirmed Expansion Pack contracts, signal normalization, first-pass
  candidate generation, cluster assembly, degraded behavior and repository
  abstraction satisfy the accepted Issue #19 scope.
- Confirmed broad Long-tail Discovery combinatorics, concrete persistence,
  scheduling, operator UI, SEO Page Candidate Scoring, SEO Pack generation and
  content generation remain later roadmap work.
Changed files:
- docs/implementation-order.md
- docs/progress.md
- docs/topic-expansion-model.md
Validation:
- git diff --check
Next step:
- Close GitHub Issue #19 and create/start the future Long-tail Discovery issue
  if Product Owner wants to continue that roadmap step now.

Date: 2026-07-23
Issue: #19
Status: Review needed
Summary:
- Added `packages/topic-expansion` as the runtime foundation for Topic
  Expansion Engine.
- Implemented expansion signal contracts, deterministic signal normalization,
  first-pass candidate generation, topic cluster grouping, Expansion Pack
  assembly and repository abstraction.
- Kept broad Long-tail Discovery combinatorics, concrete persistence,
  scheduling, operator UI, SEO Page Candidate Scoring, SEO Pack generation and
  content generation out of scope.
Changed files:
- nest-cli.json
- tsconfig.json
- jest.config.js
- docs/progress.md
- docs/project-map.md
- docs/topic-expansion-model.md
- packages/topic-expansion/**
Validation:
- npm test
- npm test -- --runTestsByPath packages/topic-expansion/src/expansion-pack.service.spec.ts packages/topic-expansion/src/persistence/topic-expansion.repository.spec.ts
- ./node_modules/.bin/tsc -p packages/topic-expansion/tsconfig.lib.json --noEmit
- ./node_modules/.bin/nest build topic-expansion
- git diff --check
Next step:
- Review and merge the foundation before close-out stabilization for Issue
  #19.

Date: 2026-07-23
Issue: #19
Status: Review needed
Summary:
- Started Topic Expansion Engine as a design-only PR after Issue #30 closed.
- Defined expansion signals, candidate types, topic clusters, Expansion Pack
  contracts and deterministic generation rules.
- Explicitly separated Issue #19 first-pass expansion from future Long-tail
  Discovery Engine combinatorics and advanced Opportunity Scoring.
Changed files:
- docs/architecture.md
- docs/progress.md
- docs/project-map.md
- docs/topic-expansion-model.md
Validation:
- git diff --check
- Architecture Steward review: no runtime architecture blocker; wording
  tightened around candidate-generator scope and operator seed constraints.
Next step:
- Merge the design before implementing `packages/topic-expansion`.

Date: 2026-07-23
Issue: #30
Status: Done
Summary:
- Closed out SERP Intent Analyzer after design and foundation implementation
  merged.
- Confirmed deterministic SERP Intent Pack contracts, candidate extraction,
  frequency/depth/gap classification, degraded SERP handling and repository
  abstraction satisfy the accepted Issue #30 scope.
- Confirmed semantic clustering, concrete persistence, target page auditing,
  Topic Expansion runtime, SEO Pack generation and content generation remain
  later roadmap work.
Changed files:
- docs/implementation-order.md
- docs/progress.md
- docs/serp-intent-analyzer-model.md
Validation:
- git diff --check
Next step:
- Close GitHub Issue #30 and start Issue #19 Topic Expansion Engine from
  updated `main`.

Date: 2026-07-23
Issue: #30
Status: Review needed
Summary:
- Added `packages/serp-intent` as the runtime foundation for SERP Intent
  Analyzer.
- Implemented SERP Intent Pack contracts, deterministic candidate extraction
  from SERP Pack evidence, frequency/depth/gap classification, degraded SERP
  handling and repository abstraction.
- Kept semantic clustering, concrete persistence, target page auditing, Topic
  Expansion runtime, SEO Pack generation and content generation out of scope.
Changed files:
- nest-cli.json
- tsconfig.json
- jest.config.js
- docs/progress.md
- docs/project-map.md
- docs/serp-intent-analyzer-model.md
- packages/serp-intent/**
Validation:
- npm test
- npm test -- --runTestsByPath packages/serp-intent/src/serp-intent-pack.service.spec.ts packages/serp-intent/src/persistence/serp-intent.repository.spec.ts
- ./node_modules/.bin/tsc -p packages/serp-intent/tsconfig.lib.json --noEmit
- ./node_modules/.bin/nest build serp-intent
- git diff --check
Next step:
- Review and merge the foundation before close-out stabilization for Issue
  #30.

Date: 2026-07-23
Issue: #30
Status: Review needed
Summary:
- Started SERP Intent Analyzer as a design-only PR after Issue #18 closed.
- Defined SERP Intent Pack contracts, intent candidates, mandatory/opportunity
  classes, frequency/depth/gap signals and degraded/fallback behavior.
- Kept semantic clustering, concrete persistence, target page auditing, Topic
  Expansion runtime, SEO Pack generation and content generation out of the
  Issue #30 MVP scope.
Changed files:
- docs/architecture.md
- docs/progress.md
- docs/project-map.md
- docs/serp-intent-analyzer-model.md
Validation:
- git diff --check
Next step:
- Review and merge the design before implementing `packages/serp-intent`.

Date: 2026-07-23
Issue: #18
Status: Done
Summary:
- Closed out SERP Intelligence Layer after design and foundation implementation
  merged.
- Added the missing repository abstraction required by the accepted design and
  kept concrete database persistence deferred.
- Confirmed #18 owns SERP Pack foundations only; live SERP providers, rank
  tracking, SERP Intent Analyzer, SEO Pack generation and operator UI remain
  later roadmap work.
Changed files:
- docs/implementation-order.md
- docs/progress.md
- docs/project-map.md
- docs/serp-intelligence-model.md
- packages/serp-intelligence/src/index.ts
- packages/serp-intelligence/src/persistence/serp-intelligence.repository.ts
- packages/serp-intelligence/src/persistence/serp-intelligence.repository.spec.ts
- packages/serp-intelligence/src/testing/in-memory-serp-intelligence.repository.ts
Validation:
- npm test
- npm test -- --runTestsByPath packages/demand-engine/src/demand-engine.service.spec.ts packages/serp-intelligence/src/serp-pack.service.spec.ts packages/serp-intelligence/src/persistence/serp-intelligence.repository.spec.ts
- ./node_modules/.bin/tsc -p packages/serp-intelligence/tsconfig.lib.json --noEmit
- ./node_modules/.bin/nest build serp-intelligence
- git diff --check
Next step:
- Close GitHub Issue #18 and start Issue #30 SERP Intent Analyzer from
  updated `main`.

Date: 2026-07-23
Issue: #18
Status: Review needed
Summary:
- Added `packages/serp-intelligence` as the runtime foundation for the SERP
  Intelligence Layer.
- Implemented SERP snapshot/result/page-evidence contracts, heading/FAQ/entity
  pattern analysis, content depth summaries, content angle detection and SERP
  Pack assembly.
- Added the SERP Intelligence repository abstraction and in-memory test
  implementation; concrete database persistence remains deferred.
- Kept live SERP providers, persistence, rank tracking, SERP Intent Analyzer
  and SEO Pack generation out of scope for this foundation PR.
Changed files:
- nest-cli.json
- tsconfig.json
- docs/progress.md
- docs/project-map.md
- docs/serp-intelligence-model.md
- packages/serp-intelligence/**
Validation:
- npm test
- npm test -- --runTestsByPath packages/demand-engine/src/demand-engine.service.spec.ts packages/serp-intelligence/src/serp-pack.service.spec.ts packages/serp-intelligence/src/persistence/serp-intelligence.repository.spec.ts
- ./node_modules/.bin/tsc -p packages/serp-intelligence/tsconfig.lib.json --noEmit
- ./node_modules/.bin/nest build serp-intelligence
- git diff --check
Next step:
- Review and merge the foundation before close-out stabilization for Issue
  #18.

Date: 2026-07-23
Issue: #18
Status: Review needed
Summary:
- Started SERP Intelligence Layer as a design-only PR after #98 closed.
- Defined SERP snapshots, result references, heading/FAQ/entity/depth/angle
  analysis, SERP expectations and SERP Pack contracts.
- Kept live paid SERP providers, rank tracking, SERP Intent Analyzer, SEO Pack
  generation, semantic FAQ clustering and competitor crawl orchestration out of
  the Issue #18 foundation scope.
Changed files:
- docs/architecture.md
- docs/progress.md
- docs/project-map.md
- docs/serp-intelligence-model.md
Validation:
- git diff --check
Next step:
- Review and merge the design before implementing `packages/serp-intelligence`.

Date: 2026-07-23
Issue: #98
Status: Done
Summary:
- Closed out Demand Engine Runtime foundation after the provider-optional
  package, fallback/manual discovery, keyword candidates, candidate pages and
  nullable metric snapshots merged.
- Confirmed missing paid provider data is non-blocking and unknown metrics
  remain null.
- Confirmed persistence, scheduling, paid provider integrations, SERP
  Intelligence runtime, Topic Expansion, Long-tail Discovery and SEO Pack
  generation remain later roadmap work.
Changed files:
- docs/demand-engine-model.md
- docs/implementation-order.md
- docs/progress.md
Validation:
- git diff --check
Next step:
- Close GitHub Issue #98 and start Issue #18 SERP Intelligence Layer from
  updated `main`.

Date: 2026-07-23
Issue: #98
Status: Review needed
Summary:
- Started Demand Engine Runtime after #16 closed and #72 design was already
  accepted.
- Added the initial `packages/demand-engine` boundary with provider adapter
  contracts, fallback/manual discovery, keyword candidates, candidate pages,
  nullable metric snapshots, confidence and explicit fallback mode.
- Kept paid provider integrations, SERP Intelligence runtime, Topic Expansion,
  Long-tail Discovery, SEO Pack generation and persistence out of this
  foundation PR.
Changed files:
- docs/demand-engine-model.md
- docs/progress.md
- jest.config.js
- nest-cli.json
- packages/demand-engine/*
- tsconfig.json
Validation:
- npm test -- demand-engine
- npx nest build demand-engine
- npm test
- npm run build
- git diff --check
Next step:
- Review and merge the runtime foundation before deciding whether #98 needs a
  persistence/API follow-up or close-out stabilization.

Date: 2026-07-23
Issue: #16
Status: Done
Summary:
- Closed out SEO Consensus and Conflict Layer after design, foundation package,
  fact mapping storage and safe Knowledge Pack consensus consumption merged.
- Confirmed Source Trust remains an input, not a replacement for consensus.
- Confirmed SEO Pack generation, SERP analysis, keyword demand scoring,
  editorial UI and content generation remain later roadmap items.
Changed files:
- docs/implementation-order.md
- docs/progress.md
- docs/seo-consensus-model.md
Validation:
- git diff --check
Next step:
- Close GitHub Issue #16 and continue the canonical roadmap at #98 Demand
  Engine Runtime, since #72 Demand Engine Design is already done.

Date: 2026-07-23
Issue: #16
Status: Review needed
Summary:
- Added safe Knowledge Pack consumption of SEO Consensus metadata after the
  SEO Consensus foundation merged.
- Added explicit consensus/conflict fact mapping tables so Knowledge Pack can
  resolve consensus metadata by canonical fact id without JSON scans.
- Knowledge Pack now exposes optional fact-level `consensus` metadata while
  preserving existing output when consensus records are absent.
Changed files:
- docs/progress.md
- docs/seo-consensus-model.md
- packages/db/src/db.service.ts
- packages/db/src/migrations/012-seo-consensus-fact-mappings.ts
- packages/knowledge-pack/*
- packages/seo-consensus/*
Validation:
- npm test -- knowledge-pack
- npm test -- seo-consensus
- npx nest build knowledge-pack
- npx nest build seo-consensus
- npm test
- npm run build
- git diff --check
Next step:
- Review and merge score consumption, then close out Issue #16 if no remaining
  accepted scope is missing.

Date: 2026-07-23
Issue: #16
Status: Review needed
Summary:
- Implemented the initial SEO Consensus package boundary after the design PR
  merged.
- Added comparable value normalization, consensus grouping, conflict detection,
  SEO phrasing hints, content gap hints, repository contracts and minimum
  persistence schema.
- Kept Knowledge Pack/SEO Pack consumption, SERP analysis, keyword demand
  scoring, editorial UI and generation out of this foundation PR.
Changed files:
- docs/progress.md
- docs/project-map.md
- docs/seo-consensus-model.md
- jest.config.js
- nest-cli.json
- packages/db/src/db.service.ts
- packages/db/src/migrations/011-seo-consensus-foundation.ts
- packages/seo-consensus/*
- tsconfig.json
Validation:
- npm test -- seo-consensus
- npx nest build seo-consensus
- npm test
- npm run build
- git diff --check
Next step:
- Review and merge the foundation PR, then add safe pack consumption or
  close-out stabilization depending on review.

Date: 2026-07-23
Issue: #16
Status: Review needed
Summary:
- Started SEO Consensus and Conflict Layer as a design-only PR after #15
  closed.
- Defined the boundary between Source Trust scoring and consensus decisions.
- Documented consensus groups, conflict sets, comparable value handling, SEO
  phrasing hints, content gap hints, storage model and MVP exclusions.
Changed files:
- docs/architecture.md
- docs/progress.md
- docs/project-map.md
- docs/seo-consensus-model.md
Validation:
- git diff --check
Next step:
- Review and merge the design before implementing `packages/seo-consensus`.

Date: 2026-07-23
Issue: #15
Status: Done
Summary:
- Closed out Source Trust and Evidence Scoring after the design, foundation
  package and safe Knowledge Pack score consumption merged.
- Confirmed score components remain visible and separate from final confidence.
- Confirmed contradiction resolution and consensus decisions remain reserved
  for Issue #16 SEO Consensus and Conflict Layer.
Changed files:
- docs/implementation-order.md
- docs/progress.md
- docs/source-trust-model.md
Validation:
- git diff --check
Next step:
- Close GitHub Issue #15 and start Issue #16 from updated `main`.

Date: 2026-07-23
Issue: #15
Status: Review needed
Summary:
- Added safe Knowledge Pack consumption of Source Trust score records after the
  Source Trust foundation merged.
- Knowledge Pack now exposes optional `trust` metadata on sources, facts and
  entities when score records exist, while preserving unknown trust when they
  do not.
- Unresolved conflict flags from fact scores become explicit Knowledge Pack
  evidence gaps without attempting consensus.
Changed files:
- docs/progress.md
- docs/source-trust-model.md
- packages/knowledge-pack/*
Validation:
- npm test -- knowledge-pack
- npx nest build knowledge-pack
- npm test
- npm run build
- git diff --check
Next step:
- Review and merge score consumption, then close out Issue #15 if no remaining
  accepted scope is missing.

Date: 2026-07-23
Issue: #15
Status: Review needed
Summary:
- Implemented the initial Source Trust package boundary after the design PR
  merged.
- Added deterministic source classification, source trust scoring, evidence
  aggregation, fact score calculation, entity score calculation, repository
  contracts and minimum persistence schema.
- Kept external authority providers, contradiction resolution, SEO Consensus,
  worker orchestration and Knowledge Pack score consumption out of this
  foundation PR.
Changed files:
- docs/progress.md
- docs/source-trust-model.md
- jest.config.js
- nest-cli.json
- packages/db/src/db.service.ts
- packages/db/src/migrations/010-source-trust-foundation.ts
- packages/source-trust/*
- tsconfig.json
Validation:
- npm test -- source-trust
- npx nest build source-trust
- npm test
- npm run build
- git diff --check
Next step:
- Review and merge the foundation PR, then add safe score consumption or
  close-out stabilization depending on review.

Date: 2026-07-23
Issue: #15
Status: Review needed
Summary:
- Started Source Trust and Evidence Scoring as a design-only PR after #14
  closed.
- Defined the core separation between extraction confidence, normalization
  confidence, source trust, evidence strength and final confidence.
- Documented source types, scoring dimensions, storage model, service
  boundaries, Knowledge Pack integration and MVP exclusions.
Changed files:
- docs/architecture.md
- docs/progress.md
- docs/project-map.md
- docs/source-trust-model.md
Validation:
- git diff --check
Next step:
- Review and merge the design before implementing `packages/source-trust`.

Date: 2026-07-23
Issue: #14
Status: Done
Summary:
- Closed out Knowledge Pack Builder after the design, foundation package and
  safe opt-in Context Pack bridge merged.
- Confirmed GitHub Issue #14 is closed and repository docs now mark the issue
  complete.
- Confirmed Source Trust, SEO Consensus, SERP/SEO Pack generation and content
  generation remain later roadmap items.
Changed files:
- docs/implementation-order.md
- docs/knowledge-pack-model.md
- docs/progress.md
Validation:
- git diff --check
Next step:
- Start Issue #15 Source Trust and Evidence Scoring from updated `main`.

Date: 2026-07-23
Issue: #14
Status: Review needed
Summary:
- Added the safe opt-in Context Pack bridge after the Knowledge Pack foundation
  merged.
- Context Pack behavior remains unchanged by default; callers must request
  `includeKnowledgePack` to receive Knowledge Pack data.
- Added profile mapping and an explicit `knowledge_pack_unavailable` content
  gap for manual/incomplete wiring cases.
Changed files:
- docs/knowledge-pack-model.md
- docs/progress.md
- docs/project-map.md
- packages/context-pack/*
Validation:
- npm test -- context-pack
- npx nest build api
- npm test
- npm run build
- git diff --check
Next step:
- Review and merge the bridge PR, then close out Issue #14 if review confirms
  the accepted scope is complete.

Date: 2026-07-23
Issue: #14
Status: Review needed
Summary:
- Implemented the initial Knowledge Pack package boundary after the design PR
  merged.
- Added model-agnostic DTOs, profiles, deterministic assembly service,
  repository abstraction, Knex repository, fact/source/evidence linking and
  evidence gap generation.
- Kept Source Trust, SEO Consensus, SERP/SEO Pack generation, content
  generation and Context Pack behavior changes out of this foundation PR.
Changed files:
- docs/knowledge-pack-model.md
- docs/progress.md
- docs/project-map.md
- jest.config.js
- nest-cli.json
- packages/knowledge-pack/*
- tsconfig.json
Validation:
- npm test -- knowledge-pack
- npx nest build knowledge-pack
- npm test
- npm run build
- git diff --check
Next step:
- Review and merge the foundation PR, then add the safe opt-in Context Pack
  bridge before closing Issue #14.

Date: 2026-07-23
Issue: #14
Status: Review needed
Summary:
- Started Knowledge Pack Builder as a design-only PR after #13 closed.
- Defined model-agnostic request/response contracts, profiles, assembly rules,
  fact prioritization, evidence linking, source references and gap semantics.
- Kept Source Trust, SEO Consensus, SERP/SEO Pack generation and content
  generation out of the Issue #14 foundation scope.
Changed files:
- docs/architecture.md
- docs/knowledge-pack-model.md
- docs/project-map.md
- docs/progress.md
Next step:
- Review and merge the Knowledge Pack design before implementation.

Date: 2026-07-23
Issue: #13
Status: Done
Summary:
- Closed out Fact Extraction Worker after PR #107, PR #108 and PR #109 merged.
- Confirmed Issue #13 is closed and the repository now has the design model,
  package boundary, provider/noop contracts, Entity mention hints,
  raw/canonical normalization orchestration, metadata migration, dispatch
  service and dedicated worker app.
- Confirmed production model adapters, Source Trust, SEO Consensus and
  Knowledge Pack generation remain later roadmap items.
Changed files:
- docs/fact-extraction-worker-model.md
- docs/implementation-order.md
- docs/progress.md
Next step:
- Start Issue #14 Knowledge Pack Builder from updated `main`.

Date: 2026-07-23
Issue: #13
Status: Review needed
Summary:
- Added Fact Extraction queue orchestration after PR #108 merged the foundation
  package.
- Added `FACT_EXTRACTION_QUEUE_NAME`, dispatch batching, `FactExtractionJob`
  payloads, dedicated `fact-extraction-worker` app and BullMQ processor.
- Added minimal Entity mention support by resolving approved aliases in chunk
  text through the Entity Layer and passing known entity hints to extraction
  providers.
- Kept production model adapters, source trust scoring, SEO consensus,
  Knowledge Pack generation and automatic entity creation out of scope.
Changed files:
- apps/fact-extraction-worker/*
- docs/fact-extraction-worker-model.md
- docs/progress.md
- docs/project-map.md
- jest.config.js
- nest-cli.json
- package.json
- packages/common/src/queue/queue.constants.ts
- packages/entities/*
- packages/fact-extraction/*
Validation:
- npm test -- fact-extraction
- npm test -- entities
- npm test
- npm run build
- npm run build:fact-extraction-worker
Next step:
- Run full test/build checks, review and merge the worker queue PR, then close
  Issue #13 if no review comments identify missing acceptance criteria.

Date: 2026-07-23
Issue: #13
Status: Review needed
Summary:
- Implemented the initial Fact Extraction package boundary and NestJS module.
- Added extraction provider interface, noop provider, deterministic test
  provider, candidate selection, raw candidate validation and predicate
  normalization orchestration through the Ontology registry.
- Added worker-owned extraction run and normalization attempt metadata migration
  while reusing the existing `raw_facts` and `canonical_facts` tables from #12.
- Kept production model adapters, dedicated worker app, queue orchestration,
  source trust scoring and SEO consensus out of this foundation scope.
Changed files:
- docs/architecture.md
- docs/fact-extraction-worker-model.md
- docs/progress.md
- docs/project-map.md
- nest-cli.json
- packages/db/src/db.service.ts
- packages/db/src/migrations/009-fact-extraction-foundation.ts
- packages/fact-extraction/*
- tsconfig.json
Validation:
- npm test -- fact-extraction
- npm test
- npm run build
- npx nest build fact-extraction
Next step:
- Run full test/build checks, review and merge the foundation PR, then decide
  whether Issue #13 needs a worker-app/queue follow-up or close-out
  stabilization first.

Date: 2026-07-23
Issue: #13
Status: Review needed
Summary:
- Started Fact Extraction Worker as a design-only PR after #11, #12 and #28
  were accepted.
- Defined the worker guardrail: extractors generate candidates, while canonical
  facts require approved Ontology and Predicate Registry normalization.
- Documented provider modes, raw validation, predicate normalization, storage,
  job flow, reprocessing and Topic Classification context rules.
Changed files:
- docs/architecture.md
- docs/fact-extraction-worker-model.md
- docs/project-map.md
- docs/progress.md
Next step:
- Review and merge the design contract before implementing the worker runtime.

Date: 2026-07-23
Issue: #28
Status: Done
Summary:
- Started Topic Classification Strategy after Entity and Ontology foundations
  were completed.
- Chose a design/contract PR before runtime implementation to avoid mutating
  Topic Engine scope prematurely.
- Drafted `topicClassification` semantics with primary/secondary assignments,
  evidence, confidence and review-state rules.
- Merged PR #105 and closed Issue #28 as a strategy/design issue.
Changed files:
- docs/architecture.md
- docs/implementation-order.md
- docs/topic-classification-model.md
- docs/project-map.md
- docs/progress.md
Next step:
- Start Issue #13 Fact Extraction Worker using accepted Entity, Ontology and
  Topic Classification context.

Date: 2026-07-08
Issue: roadmap sync
Status: In progress
Summary:
- Audited closed and open GitHub issues for design-only or missing runtime
  work.
- Confirmed Issue #72 was intentionally closed by PR #73 as Demand Engine
  design only.
- Created Issue #98 to track Demand Engine Runtime so provider-optional keyword
  discovery implementation is not lost.
- Closed stale completed governance Issue #41.
- Added missing open Issue #28 Topic Classification Strategy to the canonical
  roadmap after #11 and #12.
Changed files:
- docs/demand-engine-model.md
- docs/implementation-order.md
- docs/progress.md
- docs/repository-audit.md
Next step:
- Review and merge this roadmap synchronization PR before continuing with the
  next implementation issue.

Date: 2026-07-08
Issue: #12
Status: Done
Summary:
- Stabilized the Ontology and Predicate Registry scope after PR #95 merged the
  foundation.
- Confirmed the implemented registry contracts, seed predicates, alias resolver,
  raw/canonical fact contracts and schema satisfy Issue #12 foundation scope.
- Kept LLM fact extraction and Knowledge Graph traversal deferred to later
  issues.
Changed files:
- docs/ontology-predicate-model.md
- docs/progress.md
Next step:
- Start Issue #13 Fact Extraction Worker from updated `main`.

Date: 2026-07-08
Issue: #12
Status: In progress
Summary:
- Created `issue/12-ontology-predicate-registry-foundation` from updated
  `main` after the design-only PR merged.
- Added the initial Ontology package boundary, predicate alias resolver,
  seed-backed registry, raw/canonical fact contracts and storage migration.
- Kept LLM fact extraction, Knowledge Graph traversal, source trust scoring and
  pack generation out of this foundation PR.
Changed files:
- README.md
- docs/ontology-predicate-model.md
- docs/progress.md
- docs/project-map.md
- jest.config.js
- nest-cli.json
- packages/db/src/db.service.ts
- packages/db/src/migrations/008-ontology-predicate-registry.ts
- packages/ontology/*
- tsconfig.json
Next step:
- Run targeted tests, full tests and build before opening the foundation PR.

Date: 2026-07-08
Issue: #12
Status: Review needed
Summary:
- Started the Ontology and Predicate Registry as a design-only PR from updated
  `main` after Issue #11 closed.
- Added the proposed model covering entity type registry, predicate registry,
  predicate aliases, attribute schemas, raw facts, canonical facts and
  normalization rules.
- Kept runtime implementation, LLM fact extraction, Knowledge Graph traversal,
  trust scoring and pack generation out of this design PR.
Changed files:
- README.md
- docs/architecture.md
- docs/ontology-predicate-model.md
- docs/progress.md
- docs/project-map.md
Next step:
- Review and merge the design-only PR before implementing Ontology and
  Predicate Registry runtime code.

Date: 2026-07-08
Issue: #11
Status: Done
Summary:
- Stabilized the Entity and Alias Layer scope after PR #92 merged the
  foundation.
- Added internal manual API endpoints for creating entities, adding aliases and
  recording mentions.
- Confirmed richer listing, review queues and admin UI flows remain deferred to
  Operator Console and future review workflows.
Changed files:
- README.md
- apps/api/src/api.module.ts
- apps/api/src/entities/*
- docs/entity-alias-model.md
- docs/progress.md
- docs/project-map.md
Next step:
- Start Issue #12 Ontology and Predicate Registry from updated `main`.

Date: 2026-07-07
Issue: #11
Status: In progress
Summary:
- Created `issue/11-entity-alias-layer-foundation` from updated `main` after
  the design-only PR merged.
- Added the initial Entities package boundary, canonical entity and alias
  contracts, mention contracts, alias resolution service and database schema
  migration.
- Kept manual API endpoints, full Knowledge Graph, fact extraction, ontology
  registry and external enrichment out of this foundation PR.
Changed files:
- README.md
- docs/entity-alias-model.md
- docs/progress.md
- docs/project-map.md
- jest.config.js
- nest-cli.json
- packages/db/src/db.service.ts
- packages/db/src/migrations/007-entity-alias-foundation.ts
- packages/entities/*
- tsconfig.json
Next step:
- Run targeted tests, full tests and build before opening the foundation PR.

Date: 2026-07-07
Issue: #11
Status: In progress
Summary:
- Started the Entity and Alias Layer as a design-only PR from updated `main`
  after Issue #10 closed.
- Added the proposed entity and alias model covering canonical entities,
  aliases, mentions, review status, storage, alias resolution, retrieval
  integration and Context Pack integration.
- Kept runtime implementation, full Knowledge Graph, fact extraction, ontology
  registry and external enrichment out of this design PR.
Changed files:
- README.md
- docs/architecture.md
- docs/entity-alias-model.md
- docs/progress.md
- docs/project-map.md
Next step:
- Review and merge the design-only PR before implementing Entity and Alias
  runtime code.

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
