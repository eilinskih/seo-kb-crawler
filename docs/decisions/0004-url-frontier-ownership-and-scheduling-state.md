# ADR 0004: URL Frontier Ownership and Scheduling State

- Status: Accepted
- Date: 2026-07-23
- Issue: #3

## Context

The URL Frontier started as the design for discovery queue and crawl
scheduling. Later implementation slices added durable frontier entries,
database leases, crawl attempt persistence, dispatch, completion feedback,
discovery observations, candidate reevaluation, canonical consolidation,
priority scoring and retry/recrawl policy handling.

During close-out review, the repository needed one accepted decision that
records the final boundary. Without that decision, scheduling behavior could
drift between URL Frontier, Research Engine Scheduling, Discovery Sources and
Crawler Worker.

## Decision

URL Frontier owns topic-scoped URL crawl state:

- normalized URL identity and deduplication;
- append-only discovery observations;
- candidate evaluation state;
- canonical relation evidence and suppression state;
- materialized priority inputs and priority score;
- durable crawl leases and active attempt references;
- crawl completion state;
- durable scheduling fields such as `nextCrawlAt`, `freshnessScore`,
  `recrawlReason` and `consecutiveFailures`.

Research Engine Scheduling owns orchestration:

- focused versus background research allocation;
- fair crawl-budget distribution across topics;
- TTL-aware reuse decisions for research assets;
- long-running scheduler jobs and dispatch planning.

Discovery Sources emit provider-neutral observations. They do not create crawl
jobs, decide final relevance or bypass Topic crawl policy.

Crawler Worker executes leased commands and reports normalized crawl results.
It does not independently schedule, prioritize or mutate URL Frontier state.

Content duplicate detection remains outside URL Frontier and belongs to
downstream document processing.

## Rationale

URL Frontier must be the durable source of truth for what URLs are eligible to
crawl and why. That keeps queue transport, worker runtime and provider
observations from becoming competing schedulers.

At the same time, URL Frontier should not become the whole research scheduler.
Fair background allocation and TTL decisions require project-level context and
belong in Research Engine Scheduling.

The split keeps Issue #3 complete without pulling future scheduler automation
or adaptive research loops into the URL Frontier close-out.

## Consequences

- Queue depth is not durable frontier state.
- BullMQ transports leased crawl commands; PostgreSQL remains the authority for
  eligibility and active attempts.
- `freshnessScore` records crawl scheduling freshness from `0` to `1`; it is
  not a factual claim that content changed.
- `recrawlReason` records why the current crawl schedule exists, such as
  initial discovery, retry backoff, successful recrawl scheduling, rediscovery,
  policy change or canonical suppression.
- Provider/source taxonomy may stay compact as long as provenance is retained
  in run IDs, source keys and bounded metadata.
- Adaptive change-frequency recrawl, production scheduler automation,
  operator-facing retry policy editing and global URL alias registries remain
  future work.

## Rejected alternatives

### Let Discovery Sources enqueue crawl jobs directly

This would bypass topic policy, relevance evaluation and durable deduplication.
Discovery Sources should produce observations only.

### Let Crawler Worker decide retry and recrawl timing

The worker does not have the full topic-scoped scheduling context. It should
return normalized results and let URL Frontier completion logic update durable
state.

### Put fair background scheduling inside URL Frontier

Fair allocation across active topics is a Research Engine Scheduling concern.
URL Frontier records eligibility and state for individual URLs; it should not
own global research budget policy.
