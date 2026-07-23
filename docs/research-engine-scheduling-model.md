# Research Engine Scheduling Model

- Status: Foundation complete for Issue #43
- Issue: #43
- Date: 2026-07-23

## Purpose

Research Engine Scheduling defines the operational model for focused, manual
and background research work.

It answers:

```txt
Which research work should run next, under which priority, budget, TTL and
topic policy?
```

It does not answer:

```txt
Is the whole topic complete?
Is research ready by percentage?
Which URL identity should be canonical?
Which crawler adapter fetches a page?
```

The Research Engine is the orchestration layer responsible for discovery,
crawling, processing, extraction, enrichment, expansion, SERP refresh and
knowledge maintenance. The Crawler Worker is one lower-level worker inside that
system.

## Core Principles

1. Every SEO generation workflow starts with Focused Research.
2. Focused Research is incremental and TTL-aware.
3. Existing knowledge is reused before new crawling or processing is scheduled.
4. The system does not attempt to decide whether a topic is complete.
5. Coverage, readiness and knowledge-completeness percentages are not valid
   generation gates.
6. Active Topics continuously receive background research budget.
7. Background budget is distributed fairly across Active Topics.
8. Generation-triggered research preempts background work.
9. Operators are responsible for keeping Active Topics relevant and pausing or
   archiving obsolete topics.

## Boundaries

Research Engine Scheduling owns:

- research job request contracts;
- research priority classes;
- Focused Research orchestration;
- Manual Research orchestration;
- fair Background Research budget allocation;
- Topic research policy interpretation;
- scheduling windows and budget accounting;
- TTL-aware reuse decisions at orchestration level;
- Research Asset metrics contract;
- media metadata policy contract;
- dispatch boundaries into existing subsystems.

Research Engine Scheduling does not own:

- Topic configuration authoring or lifecycle;
- URL normalization, canonical identity, leases or durable URL-level recrawl
  state;
- Discovery provider execution;
- HTTP crawling, browser rendering or robots decisions;
- content parsing or document versioning;
- chunking, embedding or retrieval algorithms;
- Knowledge Pack, SERP Pack or SEO Pack assembly;
- SEO content generation;
- operator UI.

URL Frontier remains the owner of URL identity, crawl leases, URL-level
priority and recrawl state. Research Engine Scheduling decides which research
objective receives budget and dispatches work through Frontier, Discovery,
SERP and downstream service boundaries.

## Research Modes

### Focused Research

Focused Research is a high-priority, generation-triggered research pass for a
concrete query, page brief, content cluster or SEO generation objective.

Triggers:

- generate page;
- generate page brief;
- generate content cluster;
- generate local SEO page;
- generate comparison page;
- refresh SEO Pack before generation.

Focused Research should:

- inspect existing Knowledge, SERP, Demand, Candidate Scoring and SEO Packs;
- identify missing or stale Research Assets;
- refresh SERP snapshots when stale or absent;
- enqueue competitor URLs through URL Frontier when needed;
- reuse fresh documents, chunks, entities and facts;
- avoid recrawling fresh URLs unless explicitly forced;
- produce or refresh the inputs needed for SEO Pack generation.

Focused Research has the highest normal priority because a user or downstream
generation workflow is waiting.

### Manual Research

Manual Research is operator-triggered work with explicit scope.

Operators may request:

- research this topic;
- research this query;
- research this competitor;
- refresh this SERP;
- refresh this domain;
- force a bounded recrawl.

Manual Research priority should be configurable. The default priority is below
generation-triggered Focused Research and above background work.

### Background Research

Background Research is low-priority continuous work that grows and refreshes
Active Topics over time.

Background sources:

- active topic seed queries;
- active topic seed domains;
- sitemap discovery;
- scheduled SERP refresh;
- scheduled recrawl of stale pages;
- entity expansion candidates;
- topic expansion candidates;
- competitor watch candidates;
- keyword expansion candidates;
- unprocessed discovery observations.

Background Research fills idle capacity but must never permanently starve older
or less recently used Active Topics.

## Topic Lifecycle And Research Eligibility

Topic lifecycle remains owned by Topic Engine.

Research Scheduling interprets lifecycle as:

- `draft`: configured but not eligible for background research;
- `active`: receives fair background budget and can trigger focused/manual
  research;
- `paused`: receives no background research; focused/manual research only when
  explicitly requested and allowed;
- `archived`: excluded from normal scheduling and new crawl work.

The system assumes Active Topics are intentionally active. If an operator keeps
many noisy topics active, background budget is divided across them instead of
the platform silently deciding they are irrelevant.

## Topic Research Policy

Each Topic may define operator-controlled research policy fields:

- background intensity: `low`, `normal`, `high`;
- daily crawl budget;
- daily SERP refresh budget;
- daily keyword expansion budget;
- daily domain discovery budget;
- recrawl TTL policy;
- max crawl depth;
- max pages;
- per-host rate limits;
- media policy.

Topic Engine owns validation and versioning of these fields. Research Engine
Scheduling only interprets accepted Topic snapshots.

Default behavior:

- every Active Topic receives a fair baseline share;
- intensity and budgets adjust shares;
- policy changes are explicit and versioned;
- hidden subjective topic importance scores are not required.

## Priority Model

Initial priority classes:

- highest: `generation_request`, `user_waiting_for_generation`;
- high: `manual_research`, `competitor_refresh_requested`;
- medium: `scheduled_serp_refresh`, `topic_expansion_candidate`,
  `recently_discovered_keyword`, `new_discovery_observation`;
- low: `stale_page_recrawl`, `sitemap_refresh`,
  `entity_expansion_background`;
- none: paused topics and archived topics for background work.

Priority classes are scheduling inputs, not quality scores.

## Fair Background Allocation

Background budget must be distributed fairly across Active Topics.

The scheduler should support:

- per-topic background budget windows;
- intensity multipliers;
- per-host and per-topic crawl ceilings;
- deficit or round-robin accounting so older topics are not starved;
- global resource limits;
- preemption by Focused Research and Manual Research.

Fairness does not imply equal crawl volume. It means every Active Topic with
eligible work receives a bounded opportunity to progress over time.

## TTL And Incremental Reuse

Before scheduling new crawl or processing work, Research Engine Scheduling must
ask existing subsystem boundaries for freshness state.

Freshness checks may include:

- normalized URL identity;
- canonical consolidation state;
- last crawled timestamp;
- last processed timestamp;
- content hash;
- HTTP ETag when available;
- Last-Modified when available;
- topic crawl policy;
- recrawl TTL;
- SERP snapshot timestamp;
- pack rule version;
- ontology or entity rule version.

If a URL or asset is fresh:

- do not fetch again unless explicitly forced;
- reuse existing documents, chunks, facts and packs.

If TTL expired:

- dispatch conditional refetch when possible;
- avoid expensive reprocessing when content hash is unchanged;
- run the minimal downstream pipeline required for changed assets.

Recrawl or refresh reasons:

- `generation_request`;
- `manual_request`;
- `ttl_expired`;
- `serp_changed`;
- `content_changed`;
- `entity_missing`;
- `ontology_updated`;
- `policy_changed`;
- `competitor_watch`.

## Research Assets

The platform should expose observable Research Assets instead of fake
completeness metrics.

Examples:

- sites crawled;
- pages crawled;
- keywords discovered;
- SERP snapshots collected;
- entities extracted;
- facts extracted;
- FAQ blocks extracted;
- documents processed;
- media assets observed;
- last crawl timestamp;
- last SERP refresh timestamp;
- stale URL count;
- unprocessed discovery count.

Do not report:

- topic coverage percentage;
- research readiness percentage;
- knowledge completeness percentage.

## Media Research Policy

Media assets are first-class Research Assets, but binary files are lazy-loaded.

Default behavior:

- collect media metadata during crawling and processing when available;
- do not download binary media by default;
- mark storage status as `metadata_only` or `not_downloaded`.

Metadata fields should support:

- document id;
- topic id;
- source URL;
- final URL;
- media URL;
- media type;
- mime type;
- width and height;
- alt text;
- title;
- caption;
- DOM position;
- surrounding heading;
- surrounding text excerpt;
- source element;
- storage status;
- storage path;
- downloaded timestamp;
- last checked timestamp;
- content hash;
- future perceptual hash;
- media potential;
- OCR status;
- vision status;
- embedding status.

Binary download happens only when:

- a concrete consumer requests OCR, Vision analysis, image embeddings, video
  frame extraction, media similarity search, competitor visual analysis or
  image recommendation generation;
- Topic Media Policy allows selected or full archive mode;
- an operator explicitly requests media download.

Topic media modes:

- `metadata_only`: default metadata collection without binary download;
- `selected`: download only selected policy or consumer-requested media;
- `full_archive`: download all allowed media within topic policy and storage
  budget.

Media binaries must not be stored in PostgreSQL. PostgreSQL stores metadata.
Binary files belong in local filesystem storage, MinIO/S3-compatible storage or
another object storage layer.

`wget` may be used only as an explicit mirroring or archive utility adapter. It
is not the normal Research Engine media collection mechanism.

## Workflow

Focused Research:

```txt
SEO generation request
  -> SEO Agent Gateway
  -> Focused Research job
  -> freshness and gap inspection
  -> SERP snapshot / competitor discovery / Frontier enqueue as needed
  -> TTL-aware crawl and processing
  -> Knowledge Platform update
  -> SEO Pack generation
  -> LLM consumer
```

Background Research:

```txt
Active Topics
  -> fair budget allocation
  -> eligible discovery / SERP / recrawl / expansion work
  -> subsystem dispatch
  -> Research Asset updates
  -> Knowledge Platform growth
```

Manual Research:

```txt
Operator request
  -> bounded manual research job
  -> configured priority
  -> subsystem dispatch
  -> Research Asset updates
```

## Storage Model

Initial tables may be added later:

`research_jobs`:

- topic id;
- mode;
- priority class;
- objective type;
- objective payload;
- status;
- requested by;
- source trigger;
- budget window id;
- created timestamp;
- started timestamp;
- completed timestamp.

`research_budget_windows`:

- topic id;
- window start;
- window end;
- allocated crawl budget;
- allocated SERP budget;
- allocated discovery budget;
- consumed crawl budget;
- consumed SERP budget;
- consumed discovery budget.

`research_asset_metrics`:

- topic id;
- metric type;
- metric value;
- source subsystem;
- observed at;
- metadata payload.

`media_assets`:

- topic id;
- document id;
- source URL;
- media URL;
- metadata payload;
- storage status;
- processing status;
- created timestamp;
- updated timestamp.

The first runtime PR may start with contracts and repository abstractions if it
preserves these accepted boundaries.

## Service Boundaries

Recommended package:

```txt
packages/research-scheduling
```

Implemented foundation package:

- `packages/research-scheduling/src/domain/research-scheduling-types.ts`
  defines research modes, priority classes, Topic research policy snapshots,
  freshness decisions, dispatch commands, Research Asset metrics and media
  policy decisions.
- `packages/research-scheduling/src/research-scheduling.service.ts` assembles
  deterministic dispatch plans from research requests, Topic snapshots and
  freshness evidence.
- `packages/research-scheduling/src/research-priority.service.ts`,
  `background-budget-allocator.service.ts`, `freshness-policy.service.ts`,
  `research-dispatch-planner.service.ts`, `media-research-policy.service.ts`
  and `research-asset-metrics.service.ts` own focused scheduling slices.
- `packages/research-scheduling/src/persistence/research-scheduling.repository.ts`
  defines the repository abstraction; concrete database persistence remains
  deferred.

Recommended services:

- `ResearchJobService`: accepts Focused, Manual and Background research
  requests.
- `ResearchPriorityService`: maps triggers to priority classes.
- `BackgroundBudgetAllocator`: distributes background budget across Active
  Topics.
- `FreshnessPolicyService`: interprets TTL and reuse decisions from subsystem
  freshness evidence.
- `ResearchDispatchPlanner`: plans bounded dispatches into Discovery Sources,
  URL Frontier, SERP Intelligence and processing pipelines.
- `ResearchAssetMetricsService`: records observable Research Asset metrics.
- `MediaResearchPolicyService`: evaluates metadata-only, selected and archive
  media policies.
- `ResearchSchedulingRepository`: persists jobs, budget windows and asset
  metrics when concrete persistence is introduced.

## Integration Points

Topic Engine:

- owns lifecycle and research policy configuration;
- Research Scheduling reads accepted snapshots.

Discovery Sources:

- executes provider adapters;
- Research Scheduling decides when discovery work receives budget.

URL Frontier:

- owns URL identity, durable crawl eligibility, leases and recrawl state;
- Research Scheduling requests bounded Frontier dispatches.

Crawler Worker:

- executes leased crawl attempts;
- Research Scheduling does not call crawler adapters directly.

Content Processing, Chunking, Embeddings and Retrieval:

- own downstream data processing;
- Research Scheduling triggers or observes work through service boundaries.

SERP Intelligence and Demand Engine:

- own their domain observations and pack outputs;
- Research Scheduling may refresh or request bounded observations.

SEO Agent Gateway:

- requests Focused Research before generation;
- consumes refreshed SEO Packs when Focused Research completes or degrades.

Operator Console:

- should expose topic controls, queue state, budgets, degraded mode and asset
  metrics once scheduling contracts exist.

## MVP Scope

The first implementation should include:

- `packages/research-scheduling`;
- research job DTOs;
- priority class DTOs;
- research mode DTOs;
- Topic research policy DTOs;
- freshness decision DTOs;
- budget allocation DTOs;
- dispatch plan DTOs;
- Research Asset metric DTOs;
- media policy DTOs;
- deterministic priority and fairness services;
- repository abstraction;
- tests for Focused Research preemption, background fairness and TTL reuse;
- documentation and progress synchronization.

The first implementation should not include:

- concrete database persistence;
- long-running scheduler daemon;
- new crawler adapters;
- direct crawler execution;
- provider integrations;
- media binary downloader;
- operator UI;
- SEO Agent Gateway runtime;
- content generation.

## Definition Of Done

Issue #43 is complete when:

- Focused Research contracts exist. Done.
- Manual Research contracts exist. Done.
- Background Research contracts exist. Done.
- priority model exists. Done.
- fair background allocation foundation exists. Done.
- Topic research policy contracts exist. Done.
- TTL-aware freshness decision contracts exist. Done.
- Research Asset metrics contracts exist. Done.
- media metadata policy contracts exist. Done.
- dispatch boundaries preserve URL Frontier and Crawler Worker ownership. Done.
- no fake coverage, readiness or completeness percentages are introduced. Done.
- documentation, progress and project map are synchronized. Done.
