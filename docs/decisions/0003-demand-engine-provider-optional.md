# ADR 0003: Provider-Optional Demand Engine

- Status: Accepted
- Date: 2026-07-05
- Issue: #72

## Context

The repository is evolving into an internal SEO Intelligence Platform for
launching and operating many SEO projects across different niches.

The current architecture is strong at Knowledge Discovery:

```txt
How should we write?
```

It is not yet strong enough at Keyword Discovery:

```txt
What should we write?
```

External SEO tools such as Ahrefs, Semrush and SE Ranking can improve search
demand discovery with keyword volume, difficulty, CPC, trends, parent topics,
competitor keywords and top pages. However, requiring paid provider credentials
would make the core platform brittle, expensive to run and unsuitable for
projects where such access is unavailable.

## Decision

Introduce Demand Engine as a dedicated SEO Intelligence subsystem for keyword
and candidate-page discovery.

The Demand Engine must be provider-optional:

- paid SEO providers improve confidence and prioritization;
- owned data improves validation when available;
- free and fallback discovery sources allow work to continue without paid API
  credentials;
- unknown metrics remain unknown rather than being fabricated.

Demand Engine owns demand entities such as keyword candidates, demand metric
snapshots, keyword clusters and candidate pages. It does not own crawling,
Topic lifecycle, Knowledge Base facts or content generation.

## Rationale

Without a Demand Engine boundary, keyword discovery logic would spread across
Topic Engine, Discovery Sources, SERP Intelligence, Topic Expansion, Long-tail
Discovery and SEO Pack generation.

A thin Demand Engine boundary prevents that drift while avoiding premature
overengineering. The initial scope can stay small: domain model, provider
contracts, fallback ingestion, nullable metrics and candidate-page proposals.

Provider-optional design keeps the platform useful in low-cost or early-stage
projects while allowing stronger paid data to be added later.

## Consequences

- Topic Engine remains the authority for topic scope and policy.
- Discovery Sources remain URL-discovery infrastructure, not the keyword
  database.
- SERP Intelligence validates observed search results but does not own demand
  entities.
- Paid SEO provider adapters become optional enrichment, not mandatory runtime
  dependencies.
- Candidate pages must expose confidence and evidence quality.
- Volume, difficulty, CPC and similar metrics must be nullable when provider
  data is unavailable.

## Rejected alternatives

### Put keyword discovery inside Topic Engine

Topic Engine should define accepted project scope and policy. If it also owns
demand discovery, topic state becomes mixed with market observations and
provider data.

### Put keyword discovery inside Discovery Sources

Discovery Sources discover URLs and emit provider-neutral URL observations.
Keyword candidates, metric snapshots and candidate pages have different
lifecycles and should not be hidden inside URL discovery runs.

### Require Ahrefs, Semrush or SE Ranking before continuing

This would improve data quality but would make the platform dependent on paid
credentials. The core pipeline must continue in fallback mode, with lower
confidence and explicit unknown metrics.
