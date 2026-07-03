# Implementation Order and Roadmap Governance

This document is the only canonical roadmap, dependency graph and
execution-order guide for the repository. It complements `docs/progress.md`,
which remains the live status and work-log tracker.

## Current repository state

- Default branch: `main`.
- Current design branch in review: `issue/4-discovery-sources-design`.
- Unmerged working branches:
  - None relevant to the canonical implementation roadmap after PR #47 lands.

Do not assume a working branch is canonical until its pull request is reviewed
and merged into `main`.

## Ownership

- Roadmap order, phases, dependencies and canonical terminology live here.
- Current status, review state and progress notes live in `docs/progress.md`.
- Accepted durable architecture decisions live in `docs/decisions/`.

## Phase 1: Foundation

| Order | Issue | Scope | Current state |
|---|---|---|---|
| 1 | #1 | Foundation: monorepo bootstrap and local infrastructure | Done on `main`. |
| 2 | #2 | Topic Engine | Implemented on `main`; issue remains open in GitHub. |
| 3 | #3 | URL Frontier design | Design approved on `main`; implementation not started. |
| 4 | #41 | Implementation order and roadmap governance | Done on `main`. |

## Phase 2: Research Engine Core

| Order | Issue | Scope | Dependency |
|---|---|---|---|
| 5 | #4 | Discovery Sources design and implementation | Design in review; implementation follows design approval. |
| 6 | #5 | Crawler Worker controlled crawling pipeline | Follows #4 design review. |
| 7 | #3 | URL Frontier implementation | Follows reviewed #4 and #5 contracts. |
| 8 | #43 | Research Engine Scheduling | Requires Topic, Frontier, Discovery and Crawler contracts. |

The Crawler Worker is one worker inside the broader Research Engine. It is not
the whole research system.

## Phase 3: Knowledge Layer

| Order | Issue | Scope | Dependency |
|---|---|---|---|
| 9 | #6 | Content Processing Pipeline | Depends on #5. |
| 10 | #7 | Chunking Engine | Depends on #6. |
| 11 | #8 | Embedding Pipeline | Depends on #7. |
| 12 | #9 | Hybrid Retrieval Engine | Depends on #8. |
| 13 | #10 | Context Pack API | Depends on #9. |

## Phase 4: Knowledge Intelligence

| Order | Issue | Scope | Dependency |
|---|---|---|---|
| 14 | #11 | Entity and Alias Layer | Can start after #7; integrates with #9/#10. |
| 15 | #12 | Ontology and Predicate Registry | Required before canonical fact extraction. |
| 16 | #13 | Fact Extraction Worker | Depends on #11 and #12. |
| 17 | #14 | Knowledge Pack Builder | Depends on #9, #11, #12 and #13. |
| 18 | #15 | Source Trust and Evidence Scoring | Depends on #13/#14 contracts. |
| 19 | #16 | SEO Consensus and Conflict Layer | Depends on #13/#15. |

## Phase 5: SEO Intelligence

| Order | Issue | Scope | Dependency |
|---|---|---|---|
| 20 | #18 | SERP Intelligence Layer | Requires Research Engine and retrieval outputs. |
| 21 | #30 | SERP Intent Analyzer | Deferred until #18. |
| 22 | #19 | Topic Expansion Engine | Depends on #18 and knowledge signals. |
| 23 | #20 | SEO Page Candidate Scoring | Depends on #18/#19. |
| 24 | #21 | SEO Pack Generator | Depends on Knowledge Pack and SERP Pack. |

## Phase 6: LLM Integration

| Order | Issue | Scope | Dependency |
|---|---|---|---|
| 25 | #42 | SEO Agent Gateway | Deferred until #10, #14, #18, #21 and #43. |

Codex is the first consumer, not the only consumer. Context, Knowledge, SERP
and SEO packs must remain model-agnostic.

## Phase 7: External Enrichment

| Order | Issue | Scope | Dependency |
|---|---|---|---|
| 26 | #17 | External Entity Enrichment Providers | Optional enrichment after local entity contracts. |
| 27 | #40 | External SEO Data Providers | Optional enrichment after internal SEO signals. |

External providers improve scoring and enrichment. They must never block the
core pipeline or become required dependencies.

## Dependency graph

```txt
#1 -> #2 -> #3 design
          -> #4 -> #5 -> #3 implementation -> #43
                                      |
                                      v
              #6 -> #7 -> #8 -> #9 -> #10
                     |           |      |
                     v           v      v
                    #11 -> #12 -> #13 -> #14 -> #15 -> #16
                                                |
                                                v
                         #18 -> #30 -> #19 -> #20 -> #21 -> #42

Optional:
#17 enriches #11/#12/#14/#18.
#40 enriches #18/#19/#20/#21/#42 and does not block #30.
```

## Architecture principles

- Knowledge-first architecture.
- Research Engine, not crawler-only architecture.
- Topic is a long-lived Knowledge Asset.
- Every SEO generation workflow starts with Focused Research.
- Background Research fairly grows all Active Topics.
- Topic-scoped crawling and research policies are always enforced.
- Free-first SEO intelligence; paid providers are optional.
- Ahrefs improves scoring; Ahrefs never blocks the pipeline.
- Core Intent before Opportunity Intent.
- SERP Expectations before blind content generation.
- Ontology-driven extraction.
- Embeddings are an index layer, not the source of truth.
- Research Assets are observable metrics.
- Do not use fake coverage, readiness or completeness percentages as
  generation gates.
- Context, Knowledge, SERP and SEO packs must be model-agnostic.

## Canonical terminology

Research Engine:
The orchestration layer responsible for discovery, crawling, processing,
extraction, enrichment, expansion, SERP refresh and knowledge maintenance.

Crawler Worker:
A lower-level worker inside the Research Engine that fetches pages.

Focused Research:
A high-priority, generation-triggered research pass for a concrete query, page
brief, content cluster or SEO generation objective.

Background Research:
Low-priority continuous work that expands and refreshes Active Topics over
time.

Knowledge Platform:
The repository's broader system for collecting, normalizing, enriching and
packaging reusable SEO knowledge.

Knowledge Asset:
A Topic that accumulates long-term research value over months or years.

Research Assets:
Observable collected assets such as sites, pages, keywords, SERP snapshots,
entities, facts, FAQ blocks, source observations and processing history.

SERP Pack:
Structured output describing how top-ranking pages present a query or topic.

SERP Intent Pack:
Structured output describing mandatory and opportunity intents observed in the
SERP.

SEO Pack:
Generation-ready package combining Knowledge, SERP, intent, evidence, gap and
opportunity signals.

SEO Agent Gateway:
Model-agnostic gateway that ensures SEO generation uses Focused Research and
structured packs before an LLM consumer generates content.
