# Implementation Order and Roadmap Governance

This document is the only canonical roadmap, dependency graph and
execution-order guide for the repository. It complements `docs/progress.md`,
which remains the live status and work-log tracker.

## Current repository state

- Default branch: `main`.
- Current design or implementation branch in review on `main`: none.
- Unmerged working branches:
  - None are canonical until reviewed and merged.

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
| 2 | #2 | Topic Engine | Implemented on `main`; issue is closed. |
| 3 | #3 | URL Frontier design | Done on `main`; implementation is complete under Order 7. |
| 4 | #41 | Implementation order and roadmap governance | Done on `main`. |

## Phase 2: Research Engine Core

| Order | Issue | Scope | Dependency |
|---|---|---|---|
| 5 | #4 | Discovery Sources design and implementation | Done on `main`; initial package contracts, planner and seed/link adapters only. |
| 6 | #5 | Crawler Worker controlled crawling pipeline | Done on `main`; lifecycle implementation is ready for downstream issues. |
| 7 | #3 | URL Frontier implementation | Done on `main`; close-out stabilization records durable scheduling state and ADR 0004. |
| 8 | #43 | Research Engine Scheduling | Done on `main`; downstream LLM integration may start. |

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
| 16 | #28 | Topic Classification Strategy | Design accepted on `main`; informs downstream knowledge and SEO consumers. |
| 17 | #13 | Fact Extraction Worker | Done on `main`; Issue #14 may start. |
| 18 | #14 | Knowledge Pack Builder | Done on `main`; Issue #15 may start. |
| 19 | #15 | Source Trust and Evidence Scoring | Done on `main`; Issue #16 may start. |
| 20 | #16 | SEO Consensus and Conflict Layer | Done on `main`; canonical roadmap continues with #98 because #72 is already design-complete. |

## Phase 5: SEO Intelligence

| Order | Issue | Scope | Dependency |
|---|---|---|---|
| 21 | #72 | Demand Engine Design | Design accepted on `main`; runtime implementation is tracked by #98. |
| 22 | #98 | Demand Engine Runtime | Done on `main`; provider integrations, persistence and scheduling are later hardening work. |
| 23 | #18 | SERP Intelligence Layer | Done on `main`; Issue #30 may start. |
| 24 | #30 | SERP Intent Analyzer | Done on `main`; Issue #19 may start. |
| 25 | #19 | Topic Expansion Engine | Done on `main`; Issue #134 may start. |
| 26 | #134 | Long-tail Discovery Engine | Done on `main`; Issue #20 may start. |
| 27 | #20 | SEO Page Candidate Scoring | Done on `main`; Issue #21 may start. |
| 28 | #21 | SEO Pack Generator | Done on `main`; Issue #42 may start. |

## Phase 6: LLM Integration

| Order | Issue | Scope | Dependency |
|---|---|---|---|
| 29 | #42 | SEO Agent Gateway | Done on `main`; optional external enrichment may start. |

Codex is the first consumer, not the only consumer. Context, Knowledge, SERP
and SEO packs must remain model-agnostic.

## Phase 7: External Enrichment

| Order | Issue | Scope | Dependency |
|---|---|---|---|
| 30 | #17 | External Entity Enrichment Providers | Done on `main`; downstream consumption remains future work. |
| 31 | #40 | External SEO Data Providers | Done on `main`; concrete provider adapters remain future provider-specific work. |

External providers improve scoring and enrichment. They must never block the
core pipeline or become required dependencies.

## Phase 8: Operations

| Order | Issue | Scope | Dependency |
|---|---|---|---|
| 32 | #86 | Operator Console | Done on `main`; production hardening and richer detail/retry workflows remain future work. |

The Operator Console is an internal UI for managing topics, crawl operations,
failures, retries and provider/fallback status. It must use API/service
contracts rather than bypassing domain modules.

## Phase 9: Production Readiness

The foundation roadmap is complete. Phase 9 converts accepted deferred work
into production hardening without reopening completed foundation scope.

| Order | Issue | Scope | Dependency |
|---|---|---|---|
| 33 | #178 | Production roadmap consolidation | Done on `main`; deferred hardening work is explicit and ordered. |
| 34 | #180 | Research Operations scheduler and recrawl hardening | Depends on #3, #43 and #86. |
| 35 | #185 | Demand Engine persistence and provider-backed refresh | Depends on #98, #40 and #43. |
| 36 | #183 | SEO Intelligence persistence and scheduling | Depends on #18, #30, #19, #134, #20, #21 and #43. |
| 37 | #184 | SEO Agent Gateway generation runtime | Depends on #42, #14, #18, #21 and #43. |
| 38 | #179 | External SEO provider adapters and persistence | Depends on #40 and remains optional. |
| 39 | #181 | External Entity provider execution | Done on `main`; provider execution remains optional and fail-open. |
| 40 | #182 | Operator Console production hardening and review workflows | Done on `main`; selective retry-by-ID and richer review filters remain future scope. |
| 41 | #186 | Automatic topic universe to page candidates | Depends on #185, #181, #18 and Topic Work Run. |
| 42 | #187 | SEO KB MCP Server | Depends on #186, #42, #10 and #21. |
| 43 | TBD | Site Blueprint API for autonomous site workspaces | Depends on #186, #187 and #21. |
| 44 | TBD | Next.js static-first site generator contract | Depends on Site Blueprint API. |
| 45 | TBD | Cloudflare Pages deployment adapter and launch report | Depends on Next.js generator contract. |

Phase 9 work must preserve the repository's core fallback rule: external
providers improve confidence, but missing provider credentials must not block
research, retrieval, knowledge packs, SEO packs or generation planning.

Issue #186 closes the gap between a manually supplied topic and usable SEO page
candidates. The expected product flow is topic-first: a Product Owner or Codex
workspace provides a topic seed, then Topic Work Run automatically performs
focused SERP discovery, Demand Engine topic-universe expansion, bounded SERP
validation for generated queries, URL Frontier submission and downstream
research dispatch. No manual keyword spreadsheet or manual SERP import should
be required for the normal workflow.

The #186 implementation must stay provider-optional. Paid keyword providers
may improve metrics later, but fallback mode must still produce explicit
candidate pages with nullable metrics, readiness, missing research gaps and
SERP evidence when OpenSERP/free sources are available.

The next product milestone is an autonomous site conveyor:

```txt
topic seed or keyword list
-> Topic Work Run
-> Demand candidate pages
-> SEO Packs
-> Site Blueprint
-> Next.js static-first site workspace
-> Cloudflare Pages deployment
-> launch report and indexing handoff
```

Site Blueprint is the canonical handoff from this repository to a project
workspace that builds a site. It must aggregate candidate pages, SEO Pack
readiness, internal-linking hints, sitemap routes, language/geo targeting and
Cloudflare Pages constraints. Site workspaces should consume the blueprint
through API or MCP rather than reconstructing page plans from historical chat
context.

Cloudflare Pages is the primary deployment target for generated sites. Site
generation should therefore prefer Next.js static export, `out` build output
and static-first routes, and explicitly flag any server-only runtime
requirement before implementation. Production deployment automation must
produce a launch report that records generated routes, deployed URL, build
status, indexing handoff status and unresolved SEO research gaps.

Google SERP acquisition remains a product-critical reliability concern. Google
organic URLs may be unavailable, rate-limited, challenged or represented through
redirect wrappers such as `/goto`. SERP storage and provider adapters must
preserve enough information to distinguish displayed URLs, click URLs, resolved
canonical URLs and unresolved/degraded URL resolution state. The product may
continue in fallback mode, but Google TOP-10 coverage must be treated as a
separate production-readiness blocker for fully autonomous site generation.

## Dependency graph

```txt
#1 -> #2 -> #3 design
          -> #4 design -> #5 design -> #4 implementation -> #5 implementation -> #3 implementation -> #43
                                                               |
                                                               v
                                                              #6 -> #7 -> #8 -> #9 -> #10
                                                                     |           |      |
                                                                     v           v      v
                                                                    #11 -> #12 -> #28 -> #13 -> #14 -> #15 -> #16
                                                                                                |
                                                                                                v
                                                                         #98 Demand Engine Runtime -> #18 -> #30 -> #19 -> #134 Long-tail Discovery -> #20 -> #21 -> #42

Optional:
#17 enriches #11/#12/#14/#18.
#40 enriches #98/#18/#19/#134/#20/#21/#42 and does not block #30.

Production hardening:
#178 -> #180 -> #185 -> #183 -> #184
     -> #179
     -> #181
     -> #182
     -> #186
     -> #187 -> Site Blueprint -> Next.js Site Generator -> Cloudflare Pages Launch
```

## Future capability: Demand Engine

Demand Engine is a required SEO Intelligence subsystem, not an optional paid
provider wrapper. It answers the demand question:

```txt
What should we write?
```

Topic Engine defines accepted project scope and policy. Demand Engine consumes
that scope and produces keyword candidates, keyword clusters, parent-topic
signals and candidate pages. SERP Intelligence, Knowledge Intelligence and SEO
Pack generation then validate and enrich those candidates.

Issue #72 introduced the Demand Engine architecture boundary as a design-only
roadmap correction. Issue #98 tracks runtime implementation and should start
with a thin foundation: candidate keyword model, candidate page model,
provider-optional adapter contracts, nullable metric snapshots,
evidence/confidence fields and fallback mode. It should not attempt to clone
Ahrefs, Semrush or SE Ranking.

Issue #72 is allowed to land early as a design-only roadmap correction because
it records a Product Owner decision and prevents Keyword Discovery semantics
from being invented later inside unrelated issues. Runtime implementation still
waits for Issue #98 in the roadmap position and accepted dependencies.

Demand Engine must support three provider tiers:

- Paid demand providers: Ahrefs, Semrush, SE Ranking, Google Ads Keyword
  Planner, DataForSEO or equivalent APIs.
- Owned data: Google Search Console, GA4, server logs, rank tracking and
  first-party performance data.
- Free and fallback discovery: manual seeds, autocomplete, People Also Ask,
  related searches, SERP snippets, competitor headings, competitor sitemaps,
  FAQ blocks, internal links and Knowledge Graph combinations.

Paid providers improve search volume, difficulty, CPC, trend, seasonality,
parent-topic and competitor-keyword confidence. They must never be required for
the core pipeline to continue. Without paid credentials, Demand Engine should
continue in fallback mode and mark volume, difficulty, CPC and traffic
potential as unknown when they are not provider-backed.

See `docs/demand-engine-model.md` and
`docs/decisions/0003-demand-engine-provider-optional.md`.

## Future capability: Long-tail Discovery Engine

Issue #134 tracks this capability.

The current architecture already supports long-tail discovery through Focused
Research, Background Research, SERP analysis, competitor crawling, Knowledge
Platform accumulation, intent extraction, Topic Expansion and background
enrichment of Active Topics.

However, long-tail discovery should become an explicit Research Engine
capability after the base research, processing, retrieval and knowledge layers
exist.

The Long-tail Discovery Engine is not a separate paid-provider wrapper. It is a
logical capability that should build on Demand Engine candidate keywords,
candidate pages, SERP evidence, competitor structure, intent signals and the
local Knowledge Graph.

Example input Topic:

```txt
laser hair removal poland
```

After Focused Research, the system may collect:

- SERP snapshots.
- Competitor pages.
- People Also Ask questions.
- Related searches.
- Competitor headings.
- FAQ blocks.
- Entities and attributes.
- Internal links from competitor sites.
- Source observations accumulated by Background Research.

From that evidence, the system should build a topic opportunity tree:

```txt
laser hair removal
+ bikini
+ face
+ armpits
+ men
+ pregnancy
+ before after
+ cost
+ krakow
+ warsaw
+ home devices
+ pain
+ contraindications
+ laser types
+ diode
+ alexandrite
```

The engine can then derive candidate long-tail pages:

```txt
laser hair removal warsaw bikini
laser hair removal krakow bikini
laser hair removal men back
laser hair removal aftercare
laser hair removal before vacation
```

The strongest version of this system should not be limited to keywords already
visible in SERP tools. It should use the Knowledge Graph to derive combinations
that may not exist in external keyword databases.

Example entity and attribute dimensions:

```txt
City
Procedure
Body Part
Gender
Price
Season
Technology
Contraindication
FAQ
Aftercare
```

Example generated combinations:

```txt
City x Procedure x Body Part
Technology x Body Part
Procedure x Contraindication
Procedure x FAQ
Procedure x Aftercare
Procedure x Price
```

This is the reason the project is a Knowledge Platform, not only an Ahrefs or
keyword-database wrapper. External SEO data may provide keyword volume and
difficulty, but the local Knowledge Graph should let the system infer new page
opportunities from domain structure.

The future SEO intelligence sequence should become:

```txt
Manual Topic Seed / Focused Research
  -> Demand Engine
  -> Candidate Keywords
  -> Candidate Pages
  -> SERP Validation
  -> Knowledge Extraction
  -> Intent Extraction
  -> Entity Extraction
  -> Knowledge Graph
  -> Long-tail Discovery
  -> Candidate Pages
  -> SEO Pack / Content Generation
```

Long-tail candidates should be ranked by an Opportunity Score that can include:

- Evidence from competitor pages.
- Weak or missing competitor coverage.
- Internal link evidence.
- FAQ and People Also Ask support.
- Entity and attribute coverage.
- Confirmation from multiple sources.
- Existing knowledge already available in the local database.
- Optional external keyword volume and difficulty when providers are enabled.

This capability has now been added as a dedicated roadmap issue after the
Demand Engine, Research Engine, Content Processing Pipeline, base Retrieval and
foundational Knowledge Intelligence layers became available. It should evolve
the platform naturally rather than changing the current MVP architecture.

## Architecture principles

- Knowledge-first architecture.
- Research Engine, not crawler-only architecture.
- Topic is a long-lived Knowledge Asset.
- Every SEO generation workflow starts with Focused Research.
- Background Research fairly grows all Active Topics.
- Topic-scoped crawling and research policies are always enforced.
- Demand Engine owns search-demand discovery and candidate pages.
- Demand discovery works in fallback mode without paid provider credentials.
- Free-first SEO intelligence; paid providers are optional.
- Ahrefs improves scoring; Ahrefs never blocks the pipeline.
- Core Intent before Opportunity Intent.
- SERP Expectations before blind content generation.
- Ontology-driven extraction.
- Long-tail discovery should use the Knowledge Graph, not only keyword tools.
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

Demand Engine:
The SEO Intelligence subsystem that turns Topic scope, provider-optional demand
sources, owned data, fallback sources and Knowledge Graph combinations into
keyword candidates, clusters and candidate pages.

Demand Pack:
Structured output describing candidate keywords, candidate pages, demand
metrics when available, confidence, evidence quality and unknown metrics.

SERP Pack:
Structured output describing how top-ranking pages present a query or topic.

SERP Intent Pack:
Structured output describing mandatory and opportunity intents observed in the
SERP.

SEO Pack:
Generation-ready package combining Knowledge, SERP, intent, evidence, gap and
opportunity signals.

Long-tail Discovery Engine:
A logical SEO Intelligence capability that expands Demand Engine candidates
into long-tail page opportunities from SERP evidence, competitor structure,
intent signals and Knowledge Graph entity combinations.

SEO Agent Gateway:
Model-agnostic gateway that ensures SEO generation uses Focused Research and
structured packs before an LLM consumer generates content.
