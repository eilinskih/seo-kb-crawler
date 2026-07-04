# URL Frontier Model

- Status: Design approved; implementation not started
- Issue: #3
- Date: 2026-06-10

## Purpose

The URL Frontier converts discovered URL candidates into deduplicated,
policy-compliant and prioritized crawl work. It owns URL identity, candidate
state, scheduling decisions and crawl-result state transitions.

This document is an approved design contract. URL Frontier code must not be
implemented until the dependent Discovery Sources and Crawler Worker contracts
are reviewed and the implementation order in `docs/implementation-order.md`
allows it.

## Boundaries

The URL Frontier owns:

- URL candidate normalization and canonical identity.
- Topic-scoped candidate deduplication.
- Candidate acceptance and rejection state.
- Crawl priority calculation inputs and ordering.
- Freshness and recrawl scheduling state.
- Crawl lease state and crawl-result lifecycle.
- Topic configuration snapshot references.
- Idempotent ingestion of discovery candidates.

The URL Frontier does not own:

- Topic configuration authoring or lifecycle.
- Search, sitemap or link discovery provider execution.
- HTTP requests, browser rendering or robots fetching.
- Content parsing, canonical extraction from fetched HTML or document storage.
- BullMQ transport details.
- Relevance model training or embedding generation.

## Core model

The aggregate root is `FrontierEntry`. It represents one normalized URL within
one Topic.

```txt
FrontierEntry identity = (topicId, normalizedUrlHash)
```

The same normalized URL may exist in multiple topics because policy, relevance,
priority and recrawl requirements are topic-specific.

### Frontier entry fields

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Immutable internal identifier. |
| `topicId` | UUID | Immutable owning Topic. |
| `normalizedUrl` | URL string | Immutable identity URL after normalization. |
| `normalizedUrlHash` | binary or hex digest | Immutable indexed identity digest. |
| `canonicalUrl` | URL string or null | Current canonical identity after trusted evidence. |
| `canonicalSource` | enum or null | `redirect`, `http-link`, `content`, or `operator`. |
| `candidateStatus` | enum | Discovery and acceptance lifecycle. |
| `crawlStatus` | enum | Crawl execution lifecycle. |
| `priority` | integer | Materialized scheduling priority. |
| `relevanceScore` | decimal or null | Latest normalized score from `0` to `1`. |
| `freshnessScore` | decimal | Scheduling freshness score from `0` to `1`. |
| `nextCrawlAt` | UTC timestamp or null | Earliest eligible crawl time. |
| `lastDiscoveredAt` | UTC timestamp | Latest candidate observation. |
| `lastCrawledAt` | UTC timestamp or null | Latest completed crawl attempt. |
| `lastSuccessfulCrawlAt` | UTC timestamp or null | Latest successful fetch. |
| `consecutiveFailures` | non-negative integer | Reset after successful crawl. |
| `topicConfigurationVersion` | positive integer | Snapshot used for latest decision. |
| `crawlPolicyFingerprint` | digest | Detects policy changes affecting eligibility. |
| `leaseOwner` | string or null | Worker lease identity. |
| `leaseExpiresAt` | UTC timestamp or null | Prevents permanent in-flight state. |
| `createdAt` | UTC timestamp | Immutable. |
| `updatedAt` | UTC timestamp | Updated on state change. |

## URL candidate lifecycle

Candidate state answers whether a URL belongs in the frontier for a Topic.

```txt
discovered
  -> evaluating
  -> accepted
  -> rejected
  -> suppressed

accepted -> suppressed
rejected -> evaluating
suppressed -> evaluating
```

### States

- `discovered`: candidate persisted but not yet evaluated.
- `evaluating`: normalization, policy and relevance checks are in progress.
- `accepted`: eligible for scheduling.
- `rejected`: currently outside policy or below relevance threshold.
- `suppressed`: retained but intentionally excluded by operator action,
  permanent failure policy or canonical consolidation.

Rejection is not terminal. A new Topic configuration version may reevaluate a
rejected candidate. Suppression requires an explicit reason and is not cleared
automatically.

### Candidate observations

Discovery observations are append-only evidence attached to a frontier entry:

| Field | Purpose |
|---|---|
| `sourceType` | Search, sitemap, seed, link or operator. |
| `sourceKey` | Provider-neutral source identifier. |
| `discoveredUrl` | Original URL before normalization. |
| `discoveredAt` | Observation timestamp. |
| `sourceUrl` | Referring page or sitemap when available. |
| `anchorText` | Optional discovery text. |
| `sourceRank` | Optional provider result rank. |
| `metadata` | Bounded provider-neutral metadata. |
| `idempotencyKey` | Prevents duplicate observation ingestion. |

Observations do not create duplicate frontier entries.

## URL normalization rules

Normalization produces a stable crawl identity without guessing content-level
canonical intent.

### Structural normalization

1. Parse with a standards-compliant URL parser.
2. Permit `http` and `https` schemes only.
3. Lowercase scheme and host.
4. Convert internationalized hostnames to ASCII using IDNA.
5. Remove the trailing dot from hostnames.
6. Remove default ports (`80` for HTTP, `443` for HTTPS).
7. Remove URL fragments.
8. Replace an empty path with `/`.
9. Resolve dot segments in the path.
10. Preserve path case.
11. Preserve percent-encoded reserved characters.
12. Decode percent-encoded unreserved characters.
13. Encode spaces and invalid characters using UTF-8 percent encoding.

### Query normalization

- Parse query parameters as ordered key-value pairs.
- Remove configured tracking parameters such as `utm_*`, `gclid` and `fbclid`.
- Remove topic-configured ignored parameters.
- Preserve repeated parameters.
- Sort parameters by normalized key and then value for identity.
- Preserve blank values.
- Do not remove unknown parameters automatically.
- Maximum query length and parameter count are bounded.

Tracking and ignored parameter rules must be versioned. A rule change may
require controlled re-normalization and duplicate consolidation.

### Trailing slash strategy

The frontier does not universally equate `/path` and `/path/`. They may identify
different resources. A redirect or trusted content canonical may consolidate
them later.

### HTTP and HTTPS strategy

HTTP and HTTPS remain distinct normalized identities until redirect or trusted
canonical evidence establishes equivalence.

## Canonical URL strategy

Normalization and canonicalization are separate:

- Normalization is deterministic before crawling.
- Canonicalization uses evidence learned during or after crawling.

Canonical evidence precedence:

1. Operator override.
2. Permanent redirect target.
3. Valid HTTP `Link: rel="canonical"`.
4. Valid HTML canonical link.

Canonical evidence is accepted only when:

- The target URL is structurally valid.
- The target remains allowed by the Topic crawl policy.
- Redirect loops or canonical cycles are absent.
- Cross-host canonicalization passes configured policy.

When entry A becomes canonical to entry B:

- A remains stored for history and discovery evidence.
- A is suppressed with reason `canonical_duplicate`.
- Future observations for A resolve to B.
- Topic-scoped priority and discovery evidence are consolidated idempotently.
- Crawl history is retained on the original entry.

Canonical relationships are topic-scoped because different Topics may have
different host policies.

## Deduplication strategy

Deduplication has three stages.

### Stage 1: ingestion idempotency

Each discovery observation has an idempotency key derived from:

```txt
topicId + sourceType + sourceKey + discoveredUrl + discoveryRunId
```

Repeated provider delivery does not create repeated observations.

### Stage 2: normalized URL identity

A unique database constraint on:

```txt
(topicId, normalizedUrlHash)
```

prevents duplicate frontier entries. The normalized URL is compared after hash
match to protect against digest collision.

### Stage 3: canonical consolidation

Redirect and canonical evidence may consolidate multiple normalized identities
after crawling. This stage preserves aliases and crawl history.

Content-level duplicate detection is not part of the URL Frontier. It belongs
to document processing.

## Crawl priority model

Priority is deterministic and explainable. It is materialized for efficient
ordering but recomputable from stored signals.

```txt
priority =
  relevanceComponent
  + freshnessComponent
  + discoveryComponent
  + topicAdjustment
  + retryAdjustment
  + operatorAdjustment
```

The stored integer range is `-1000` to `1000`.

### Components

- `relevanceComponent`: `0..400`
- `freshnessComponent`: `0..250`
- `discoveryComponent`: `0..150`
- `topicAdjustment`: `-100..100`
- `retryAdjustment`: `-200..0`
- `operatorAdjustment`: `-500..500`

Ties are ordered by:

1. Lowest `nextCrawlAt`.
2. Highest priority.
3. Earliest `lastCrawledAt`, with never-crawled first.
4. Stable `id`.

The queue transport must not become the source of truth for priority. The
database frontier selects and leases work; BullMQ transports the leased job.
The current dispatch boundary leases one eligible entry and publishes the crawl
command with the attempt ID as the BullMQ job ID. Recurring scheduler
orchestration and crawl-budget loops are still future work. The API exposes a
manual bounded dispatch endpoint for operator-triggered batches.

## Relevance score integration

The Topic relevance profile evaluates candidate evidence available at each
stage.

Before crawl, available fields may include:

- URL.
- Search result title or snippet.
- Anchor text.
- Source host.
- Sitemap metadata.

The frontier stores:

- `relevanceScore`.
- `relevanceDecision`: `accepted`, `rejected`, or `insufficient_evidence`.
- `relevanceExplanation`.
- `relevanceProfileVersion`.
- `evaluatedAt`.

`insufficient_evidence` may be accepted for one bounded exploratory crawl if
policy permits it. This avoids a cold-start loop where body relevance cannot be
known before crawling.

After content processing, a richer score may update future scheduling but does
not rewrite the historical pre-crawl decision.

## Freshness score model

Freshness estimates the value of crawling now. It is not a factual claim that
content changed.

Inputs:

- Time since last successful crawl.
- Configured recrawl interval.
- Historical change frequency.
- Discovery recency and repeated rediscovery.
- HTTP cache metadata when previously observed.
- Failure backoff.

Initial formula:

```txt
ageRatio = min(1, ageSinceSuccessfulCrawl / recrawlInterval)
changeBoost = bounded historical change frequency
rediscoveryBoost = bounded recent observation frequency
failurePenalty = bounded consecutive failure penalty

freshnessScore =
  clamp(ageRatio + changeBoost + rediscoveryBoost - failurePenalty, 0, 1)
```

Never-crawled accepted entries receive freshness score `1`.

## Recrawl scheduling model

The scheduler computes `nextCrawlAt` after every completed attempt and after
relevant Topic configuration changes.

### Successful crawl

Base interval comes from the Topic crawl policy. It may be adjusted by observed
change frequency:

- Frequently changed content shortens the interval within configured bounds.
- Stable content lengthens the interval within configured bounds.
- `Cache-Control`, `Expires` and sitemap `lastmod` are advisory signals only.

### Failed crawl

Transient failures use bounded exponential backoff:

```txt
delay = min(maxBackoff, baseBackoff * 2^consecutiveFailures)
```

The current implementation uses a deterministic retry delay without jitter:

- Base backoff: 5 minutes.
- Maximum backoff: 6 hours.
- Maximum retryable consecutive failures: 5.

When the retryable failure budget is exhausted, the entry is completed as
`failed_terminal` instead of scheduling another automatic crawl. Configurable
per-topic retry policy and jitter remain future URL Frontier work.

Permanent policy rejection, unsupported content and operator suppression do not
schedule automatic retries.

### Topic changes

A new Topic configuration version may:

- Make rejected entries eligible.
- Suppress previously accepted entries.
- Change relevance or priority.
- Change recrawl interval.

Reevaluation is explicit and batched. Existing leased jobs continue with their
original Topic snapshot unless cancelled before execution.

## Crawl status lifecycle

Crawl status is separate from candidate status.

```txt
idle
  -> scheduled
  -> leased
  -> crawling
  -> succeeded
  -> failed_retryable
  -> failed_terminal
  -> idle
```

### States

- `idle`: accepted but not currently scheduled.
- `scheduled`: eligible work selected for dispatch.
- `leased`: database lease acquired and transport job being delivered.
- `crawling`: worker acknowledged execution.
- `succeeded`: fetch completed and result recorded.
- `failed_retryable`: attempt failed and recrawl/backoff is scheduled.
- `failed_terminal`: failure requires policy or operator change.

Lease expiry returns `leased` or `crawling` work to an eligible retry state.
State transitions use compare-and-set conditions to prevent duplicate workers
from completing the same attempt.

Current completion feedback updates `url_frontier_entries` after a normalized
crawl result is persisted. The update is guarded by `frontierEntryId` and
`attemptId`, clears active lease fields and maps crawler results to
`succeeded`, `failed_retryable` or `failed_terminal`. Retryable results are
scheduled with bounded exponential backoff. Exhausted retry budgets become
`failed_terminal`.

Each crawl attempt is a separate immutable record containing:

- Attempt ID.
- Frontier entry ID.
- Topic configuration version.
- Lease and worker identity.
- Start and finish timestamps.
- Final URL and redirect chain.
- HTTP status or failure category.
- Response metadata.
- Result artifact references.

## Topic configuration snapshot usage

Every evaluation, lease and crawl attempt references:

```txt
topicId
topicConfigurationVersion
```

The snapshot supplies:

- Language and geo targets.
- Crawl policy.
- Relevance profile.
- Optional intent profile metadata.

The Frontier stores only fields required for identity, scheduling and audit.
The Topic Engine remains the source of truth for configuration snapshots.

A candidate discovered under version N may be evaluated under a newer version
only through an explicit reevaluation operation. A leased crawl keeps the
version captured at lease time.

## Topic Engine relationship

The Topic Engine publishes or exposes immutable configuration snapshots. The
URL Frontier consumes them through a contract similar to:

```txt
TopicConfigurationReader.get(topicId, configurationVersion)
```

Contract adjustments identified by this design:

- Crawl policy needs versioned ignored query parameter rules.
- Crawl policy needs cross-host canonical behavior.
- Crawl policy needs minimum and maximum recrawl intervals.
- Relevance profile needs an explicit exploratory-crawl rule for insufficient
  pre-crawl evidence.
- Topic configuration snapshots need stable fingerprints for policy and
  relevance sections.

These changes must be incorporated when Issue #2 implementation resumes. They
do not require Topic Engine code in this design issue.

## Discovery Sources relationship

Discovery Sources produce observations, not crawl jobs.

They provide:

- Original discovered URL.
- Source type and source key.
- Discovery run ID.
- Referring URL or sitemap.
- Optional title, snippet, rank, anchor text and metadata.

They do not:

- Normalize or deduplicate against database state.
- Decide final relevance acceptance.
- Schedule crawls.
- Bypass Topic crawl policy.

The ingestion contract is provider-neutral and idempotent.

## Crawler Worker relationship

`docs/crawler-worker-model.md` defines the detailed Issue #5 contract.

The Crawler Worker consumes a leased crawl command containing:

- `attemptId`.
- `frontierEntryId`.
- `normalizedUrl`.
- `topicId`.
- `topicConfigurationVersion`.
- Required request policy subset.
- Lease expiry.

The worker:

- Validates that the lease is still active.
- Revalidates redirect targets against the policy.
- Reports structured success or failure.
- Does not independently reschedule or mutate priority.
- Does not discover arbitrary URLs directly into the crawl queue.

Links extracted during crawling return to Discovery Sources or the Frontier
ingestion boundary as new observations.

## Persistence direction

Planned PostgreSQL structures:

- `url_frontier_entries` (initial durable lease lifecycle implemented)
- `url_discovery_observations`
- `url_canonical_relations`
- `crawl_attempts` (initial durable result sink implemented)

Knex owns migrations and query composition. Raw SQL is expected for atomic
leasing, conflict handling and priority selection.

Likely PostgreSQL mechanisms:

- Unique constraints for topic-scoped normalized identity.
- `INSERT ... ON CONFLICT` for idempotent ingestion.
- `SELECT ... FOR UPDATE SKIP LOCKED` for leasing.
- Partial indexes for eligible scheduling states.
- Explicit UTC timestamps.
- JSONB only for bounded evidence and explanation payloads.

Exact schema and indexes remain implementation details after design review.

## Security and performance constraints

- URL parsing and host checks are structural, never prefix-based.
- Loopback, link-local and private network targets remain denied by default.
- DNS resolution must be revalidated at connection time to limit DNS rebinding.
- Redirects cannot widen Topic policy.
- Candidate strings, query parameters and metadata are bounded.
- User-provided regular expressions are not supported.
- Ingestion and crawl completion are idempotent.
- Scheduler queries use bounded batches and `SKIP LOCKED`.
- Queue depth is not used as durable frontier state.
- Priority recomputation is batched rather than performed globally per request.

## Proposed implementation sequence

Topic Engine implementation is complete. URL Frontier implementation remains
deferred until:

1. Issue #4 Discovery Sources design review.
2. Issue #5 Crawler Worker design review.
3. Issue #4 implementation review.
4. Issue #5 implementation review.

Issue #3 implementation may later add:

- `packages/url-frontier`.
- Frontier domain model and repository contracts.
- Knex migrations and PostgreSQL adapter.
- Candidate ingestion and reevaluation use cases.
- Atomic leasing and crawl-result use cases.
- Unit and PostgreSQL integration tests.

No Discovery Sources implementation or crawler request logic belongs to this
issue.

## Review questions

1. Should `insufficient_evidence` allow one exploratory crawl by default, or
   require explicit Topic configuration?
2. Should canonical consolidation be topic-scoped only, or also maintain a
   global URL alias registry?
3. Which query parameters should be ignored globally versus per Topic?
4. Should successful unchanged crawls increase recrawl intervals
   automatically in the first implementation?
5. Should crawl attempt transport use BullMQ job IDs equal to attempt IDs for
   end-to-end idempotency?
