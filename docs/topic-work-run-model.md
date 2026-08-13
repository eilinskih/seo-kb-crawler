# Topic Work Run Model

- Status: Initial runtime foundation in current PR.
- Owner: Research Operations / SEO Agent Gateway integration boundary.

## Purpose

Topic Work Run is the Codex-first orchestration layer for starting and
continuing work from a topic.

The product default is:

```txt
Topic exists
  -> automated bounded work run
  -> repeated background ticks while at least one eligible topic exists
```

The Product Owner should not need to manually trigger SERP import, crawl
dispatch, processing dispatch, chunking, embeddings or fact extraction for the
normal workflow.

Operator Console actions remain overrides and diagnostics, not the primary
runtime path.

## Ownership

Topic Work Run owns:

- Codex-facing `start work for topic` API.
- Continuous bounded background passes over eligible topics.
- Activating draft topics when work is explicitly started.
- Calling existing subsystem service/API boundaries in order.
- Recording in-process last-run status for operator and Codex visibility.
- Fail-open orchestration when a provider or downstream stage is degraded.

Topic Work Run does not own:

- Topic configuration semantics.
- SERP provider ranking quality.
- URL Frontier scheduling rules.
- Crawler implementation.
- Content extraction logic.
- Chunking, embedding or fact extraction algorithms.
- SEO Pack content decisions.
- Publishing workflows.

## Eligible Topics

Automated work applies to topics with lifecycle:

- `draft`;
- `active`.

Draft topics are activated when a Topic Work Run starts, as long as Topic
Engine validation allows activation.

Paused and archived topics are not processed by the continuous loop.

## Runtime Flow

Each run is bounded. It advances available work and then stops. Continuity is
provided by the background loop, not by an unbounded request.

```txt
Topic Work Run
  -> topic activation
  -> Focused SERP Discovery from topic seed keyword
  -> URL Frontier dispatch
  -> Content Processing dispatch
  -> Chunking dispatch
  -> Embedding dispatch
  -> Fact Extraction dispatch
```

Downstream workers may complete asynchronously. Later ticks continue the
pipeline from the newest durable state.

## Provider Fallback

SERP discovery must not require paid credentials.

The initial fallback provider attempts free HTML SERP sources and records
degraded status when they are blocked, irrelevant or empty. It must never
fabricate result URLs.

Paid SERP providers can later replace or precede the fallback provider through
the same provider boundary.

## APIs

Codex-facing start:

```txt
POST /topic-work-runs
```

Body:

```json
{
  "topicId": "uuid",
  "force": true
}
```

Loop tick:

```txt
POST /topic-work-runs/tick
```

Loop status:

```txt
GET /topic-work-runs/status
```

Topic last-run status:

```txt
GET /topic-work-runs/:topicId/status
```

## Continuous Operation

The API process starts the Topic Work Run loop unless disabled with:

```txt
TOPIC_WORK_RUN_AUTOSTART=false
```

Default interval:

```txt
TOPIC_WORK_RUN_INTERVAL_MS=60000
```

Focused SERP refresh attempts are throttled per process by:

```txt
TOPIC_WORK_RUN_SERP_REFRESH_INTERVAL_MS=86400000
```

## Current Limitations

- Last-run status is in-process and not durable yet.
- The continuous loop depends on the API process being online.
- Crawl, embedding and fact extraction still require their worker apps to be
  running.
- SEO Intelligence pack refresh and SEO Agent Gateway generation are not yet
  invoked by Topic Work Run.
- Free SERP fallback quality is intentionally best-effort and may degrade when
  sources block automation.

## Next Hardening

- Persist Topic Work Runs and stage transitions.
- Make pack refresh part of the automated run.
- Add provider-priority selection for paid, owned-data and free SERP providers.
- Add topic-scoped dispatch limits for URL Frontier and downstream queues.
- Expose Topic Work Run readiness directly to SEO Agent Gateway.
