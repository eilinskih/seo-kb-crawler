# Discovery Sources Model

- Status: Proposed for review
- Issue: #4
- Date: 2026-06-10

## Purpose

Discovery Sources execute configured discovery channels and emit bounded,
provider-neutral URL observations to the URL Frontier.

They answer:

- Which configured source should run?
- How is provider execution checkpointed and retried?
- How is provider-specific output converted into a stable observation?
- How are external requests constrained before any candidate reaches the
  Frontier?

This is a design-only contract. No Discovery Sources implementation, crawler
logic or URL Frontier code is included in Issue #4 design.

## Boundaries

Discovery Sources own:

- Discovery run planning from an immutable Topic configuration snapshot.
- Search, sitemap, seed and extracted-link source adapters.
- Provider capability declarations.
- Provider pagination and resumable checkpoints.
- Source-specific rate limiting and retry classification.
- Provider output normalization into candidate observations.
- Bounded batching and idempotent handoff to the URL Frontier.
- Source execution audit data and operational metrics.

Discovery Sources do not own:

- Topic configuration authoring or lifecycle.
- Final URL normalization, canonical identity or deduplication.
- Candidate relevance acceptance or crawl priority.
- Crawl scheduling or database leases.
- General page crawling, browser rendering or content extraction.
- Document storage, chunking, embeddings or retrieval.
- Provider credentials inside Topic configuration.

## Architecture

```txt
TopicConfigurationReader
  -> DiscoveryPlanner
  -> DiscoveryRunRepository
  -> DiscoveryRunDispatcher
  -> DiscoverySourceAdapter
  -> CandidateObservationSink
  -> URL Frontier
```

### Components

`DiscoveryPlanner`

- Reads an active Topic configuration snapshot.
- Produces one run per enabled source unit.
- Assigns stable source keys and idempotency keys.
- Does not call providers.

`DiscoveryRunDispatcher`

- Leases persisted runnable work.
- Sends a run command through BullMQ.
- Treats PostgreSQL as the source of truth.

`DiscoverySourceAdapter`

- Executes one provider-neutral source contract.
- Owns provider pagination and checkpoint encoding.
- Emits observations through a bounded sink.

`CandidateObservationSink`

- Accepts bounded batches.
- Applies backpressure.
- Calls the URL Frontier ingestion boundary.
- Does not normalize or deduplicate URLs itself.

## Discovery run aggregate

`DiscoveryRun` is the aggregate root for one resumable source execution.

```txt
DiscoveryRun identity =
  (topicId, topicConfigurationVersion, sourceType, sourceKey, runSequence)
```

### Fields

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Immutable run identifier. |
| `topicId` | UUID | Owning Topic. |
| `topicConfigurationVersion` | integer | Immutable snapshot version. |
| `sourceType` | enum | `search`, `sitemap`, `seed`, `link`, `operator`. |
| `sourceKey` | string | Stable provider-neutral source identity. |
| `providerKey` | string or null | Adapter registration key, not a secret. |
| `status` | enum | Run lifecycle state. |
| `checkpoint` | JSON or null | Versioned, bounded adapter checkpoint. |
| `attempt` | integer | Current execution attempt. |
| `observationsEmitted` | integer | Successful sink count. |
| `itemsExamined` | integer | Provider items processed. |
| `leaseOwner` | string or null | Current worker identity. |
| `leaseExpiresAt` | timestamp or null | Expiring execution lease. |
| `nextAttemptAt` | timestamp or null | Retry eligibility. |
| `failureCategory` | enum or null | Structured failure class. |
| `failureDetail` | string or null | Sanitized bounded detail. |
| `startedAt` | timestamp or null | First execution start. |
| `finishedAt` | timestamp or null | Terminal completion time. |
| `createdAt` | timestamp | Immutable. |
| `updatedAt` | timestamp | Last state transition. |

Provider credentials, response bodies and authentication data are never stored
in the aggregate.

## Run lifecycle

```txt
planned
  -> queued
  -> leased
  -> running
  -> completed
  -> partial
  -> failed_retryable
  -> failed_terminal
  -> cancelled

partial -> queued
failed_retryable -> queued
leased/running -> queued after lease expiry
```

- `planned`: durable run exists but is not dispatchable yet.
- `queued`: eligible for leasing and BullMQ delivery.
- `leased`: database lease acquired.
- `running`: worker acknowledged the command.
- `completed`: source exhausted successfully.
- `partial`: valid checkpoint persisted after a configured work boundary.
- `failed_retryable`: transient provider, transport or quota failure.
- `failed_terminal`: invalid configuration, unsupported response or exhausted
  retry budget.
- `cancelled`: Topic pause/archive or explicit operator cancellation.

Run state changes use compare-and-set conditions. BullMQ retries do not replace
the durable run lifecycle.

## Planning model

Planning is deterministic for one Topic snapshot.

### Search runs

One run is planned per configured query:

```txt
sourceType = search
sourceKey =
  hash(query text + language + geo + maxResults + providerKey)
```

Changing a query or provider creates a new source key. Replaying the same
snapshot does not create duplicate active runs.

### Sitemap runs

One root run is planned per configured sitemap URL. Nested sitemap indexes are
represented inside the run checkpoint rather than as independent Topics or
Frontier entries.

### Seed runs

One run may emit all configured seed URLs in bounded batches. Seed execution
requires no external request.

### Link runs

Extracted links are supplied by a future Crawler Worker result contract. They
are observations associated with the referring crawl attempt, not autonomous
web exploration by the Discovery Sources worker.

## Adapter contract

Conceptual TypeScript contract:

```ts
interface DiscoverySourceAdapter {
  readonly key: string;
  readonly sourceType: DiscoverySourceType;
  readonly capabilities: DiscoveryProviderCapabilities;

  execute(
    context: DiscoveryExecutionContext,
    sink: CandidateObservationSink,
  ): Promise<DiscoveryExecutionResult>;
}
```

`DiscoveryExecutionContext` contains:

- Run and attempt IDs.
- Topic ID and configuration version.
- The minimum source-specific configuration subset.
- Language and geo targets required by the provider.
- A versioned checkpoint.
- Abort signal and execution deadline.
- Credential references resolved by infrastructure.
- Safe network gateways appropriate to the source type.

It does not expose database repositories, the complete application container or
unbounded Topic configuration.

## Provider capabilities

Adapters declare capabilities before planning:

```txt
supportsLanguage
supportsCountry
supportsRegion
supportsPagination
supportsResultRank
supportsResultSnippet
supportsFreshnessFilter
maximumPageSize
```

The planner rejects an incompatible provider/configuration pair rather than
silently dropping requested language or geo constraints.

Provider selection is deployment configuration:

```txt
DISCOVERY_SEARCH_PROVIDER=...
DISCOVERY_SEARCH_CREDENTIAL_REF=...
```

Topic configuration remains vendor-neutral.

## Candidate observation contract

Every emitted observation contains:

| Field | Rules |
|---|---|
| `topicId` | Required. |
| `topicConfigurationVersion` | Required immutable snapshot reference. |
| `discoveryRunId` | Required. |
| `sourceType` | Search, sitemap, seed, link or operator. |
| `sourceKey` | Stable source identity. |
| `discoveredUrl` | Original provider URL, bounded; not Frontier-normalized. |
| `discoveredAt` | UTC observation time. |
| `sourceUrl` | Optional referrer or sitemap URL. |
| `title` | Optional bounded provider title. |
| `snippet` | Optional bounded provider snippet. |
| `anchorText` | Optional bounded link text. |
| `sourceRank` | Optional positive integer. |
| `metadata` | Bounded provider-neutral JSON. |
| `idempotencyKey` | Required deterministic key. |

Idempotency key:

```txt
hash(
  topicId
  + topicConfigurationVersion
  + discoveryRunId
  + sourceType
  + sourceKey
  + discoveredUrl
  + providerItemIdentity
)
```

The source preserves the original URL. URL parsing, normalized identity and
topic-scoped deduplication remain URL Frontier responsibilities.

## Search source

Search adapters call an external search API, not public search-result HTML.

Rules:

- Queries come only from the Topic snapshot.
- Language and geo parameters are mapped only when provider capabilities
  support them.
- Pagination stops at `maxResultsPerQuery`, provider exhaustion or run budget.
- Rank is global within the configured query, not reset per page.
- Provider result IDs may be retained only as bounded metadata.
- Snippets are untrusted evidence, not document content.
- Provider terms, quotas and rate limits are respected.

Provider failures:

- Authentication/configuration errors are terminal.
- Quota exhaustion is retryable only when reset time is known.
- `429` and bounded `5xx` failures use exponential backoff with jitter.
- Malformed individual results are skipped and counted.
- A malformed response envelope fails the attempt.

## Sitemap source

Sitemap discovery performs constrained metadata fetching, not general page
crawling.

Supported inputs:

- XML sitemap.
- Sitemap index.
- Gzip-compressed sitemap.

Rules:

- Fetches use a shared safe HTTP gateway contract reviewed with Issue #5.
- DNS is resolved and checked against loopback, private, link-local and reserved
  ranges before connection and after redirects.
- Redirects are bounded and cannot escape Topic crawl policy.
- Response bytes, decompressed bytes, entry count and nesting depth are bounded.
- XML external entities and DTD processing are disabled.
- Parsing is streaming.
- `loc` emits the candidate URL.
- `lastmod` is advisory bounded metadata.
- `changefreq` and `priority` are retained only as advisory metadata.
- Duplicate entries may be emitted; Frontier ingestion is idempotent.

The checkpoint stores the current sitemap/index cursor and completed child
identities. It does not store complete response bodies.

## Seed source

The seed adapter emits configured URLs exactly once per run through bounded
batches.

- It performs no network request.
- Seed order is preserved as advisory metadata.
- A seed is not automatically accepted or scheduled.
- Topic validation provides the first static private-host defense; Frontier and
  fetch-time checks remain mandatory.

## Link source

The link adapter converts structured extraction output into observations.

Input includes:

- Crawl attempt ID.
- Referring normalized URL.
- Original resolved link URL.
- Anchor text.
- Link attributes such as `rel`, when bounded and relevant.

It does not parse HTML. HTML parsing belongs to the Crawler Worker/content
processing boundary defined during Issue #5 design.

Links marked `nofollow` may still be retained as observations; policy and
priority consequences belong to the Frontier.

## Topic Engine relationship

Discovery planning requires:

```txt
TopicConfigurationReader.get(topicId, configurationVersion)
```

Only active Topics produce new planned runs. Pausing a Topic prevents new runs
and cancels queued work; already running provider calls receive cancellation
best-effort and cannot emit after cancellation is committed.

Every run keeps its original configuration version. Configuration changes
produce new runs or explicit cancellation; they do not mutate checkpoints from
older snapshots.

## URL Frontier relationship

Discovery Sources call a contract similar to:

```ts
interface CandidateObservationSink {
  appendBatch(
    observations: CandidateObservation[],
  ): Promise<CandidateObservationReceipt[]>;
}
```

Receipts distinguish:

- Accepted for evaluation.
- Duplicate observation.
- Rejected as malformed.
- Rejected by immutable Topic/snapshot mismatch.

The sink is idempotent. A timeout after submission is retried with the same
idempotency keys.

Discovery Sources do not:

- Inspect Frontier database tables.
- Decide normalized identity.
- Collapse canonical URLs.
- Set relevance score or crawl priority.
- Create BullMQ crawl jobs.

## Crawler Worker relationship

Issue #5 design must define two contracts used here:

1. A safe HTTP fetch gateway suitable for sitemap metadata requests.
2. A structured extracted-link result that can be converted into link
   observations.

Discovery Sources must not import the Crawler Worker application. Shared
contracts belong in a neutral package.

Crawler redirects, canonical tags and fetched-page links are reported as
structured results. Discovery Sources may convert links to observations;
canonical and redirect evidence goes directly to the URL Frontier crawl-result
boundary.

## Scheduling and retries

Initial triggers:

- Topic activation.
- Topic discovery configuration change.
- Operator-requested run.
- Periodic search/sitemap refresh.
- Extracted-link batch arrival.

Periodic cadence is infrastructure configuration in schema version 1. It is not
embedded in Topic configuration until a concrete per-topic scheduling use case
is approved.

Retry formula:

```txt
delay =
  min(providerMaxBackoff, baseBackoff * 2^attempt)
  + boundedJitter
```

Retry decisions use structured categories:

- `rate_limited`
- `provider_unavailable`
- `network_timeout`
- `invalid_credentials`
- `invalid_response`
- `unsafe_target`
- `cancelled`
- `budget_exhausted`
- `internal_error`

## Backpressure and budgets

Each run has bounded:

- Wall-clock execution time.
- Provider pages.
- Items examined.
- Observations emitted.
- Batch size.
- In-flight sink requests.
- Checkpoint size.
- Failure detail size.

The adapter pauses provider pagination while the sink is saturated. It does not
buffer an unbounded result set in memory or Redis.

Large sitemap runs persist checkpoints after bounded item or time intervals and
return `partial` so another lease can resume work.

## Persistence direction

Planned PostgreSQL structures:

- `discovery_runs`
- `discovery_run_attempts`

The URL Frontier owns observation persistence. Discovery Sources store only run
state, checkpoints and attempt audit data.

Likely mechanisms:

- Unique planning key per Topic snapshot and source key.
- Compare-and-set lifecycle updates.
- Expiring database leases.
- `SELECT ... FOR UPDATE SKIP LOCKED` for dispatch.
- JSONB only for versioned bounded checkpoints.
- Partial indexes for queued and retryable runs.

BullMQ transports leased run commands. Redis is not the durable run registry.

## Security

- Provider credentials use secret references and are redacted from logs.
- Search query and provider response fields are untrusted and bounded.
- Sitemap targets receive connection-time DNS/IP validation.
- Redirects are revalidated and bounded.
- Proxy environment variables are not implicitly trusted.
- XML entity expansion is disabled.
- Compressed and decompressed byte limits prevent archive bombs.
- Error bodies and headers are sanitized before persistence.
- Provider metadata cannot contain executable code or unrestricted nested JSON.
- Logs avoid complete query strings when they may contain sensitive values.

## Observability

Metrics:

- Runs by source type and final status.
- Run duration and attempt count.
- Provider latency and rate-limit events.
- Items examined and observations emitted.
- Duplicate and malformed observation receipts.
- Sitemap bytes, decompressed bytes and nesting depth.
- Sink backpressure duration.
- Lease expiry and retry counts.

Logs use run ID, Topic ID, configuration version, source type and provider key.
Credentials, response bodies and full checkpoints are excluded.

## Proposed implementation after design review

Implementation remains deferred until:

1. Issue #4 design is approved.
2. Issue #5 Crawler Worker design is approved.

Then the approved sequence is:

1. Implement Issue #4 Discovery Sources.
2. Implement Issue #5 Crawler Worker.
3. Implement Issue #3 URL Frontier.

Issue #4 implementation may add:

- `packages/discovery-sources`.
- Discovery run domain and repository contracts.
- Search, sitemap, seed and link adapters.
- BullMQ dispatch and worker integration.
- Knex migrations.
- Unit and PostgreSQL/integration tests.

No general page crawler, content processor or URL Frontier persistence belongs
to Issue #4.

## Review questions

1. Should periodic discovery cadence remain deployment-wide in schema version
   1, or become Topic configuration now?
2. Should one search provider be selected globally, or allow per-Topic provider
   selection without storing credentials?
3. Should nested sitemap indexes remain one resumable run or create child runs?
4. Should `nofollow` links be emitted with metadata or dropped by default?
5. Which safe HTTP gateway contract should Issue #5 expose for sitemap
   fetching without coupling Discovery Sources to the crawler application?
