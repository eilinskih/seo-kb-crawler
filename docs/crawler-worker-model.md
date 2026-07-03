# Crawler Worker Model

- Status: Design approved; initial implementation in progress
- Issue: #5
- Date: 2026-07-03

## Purpose

The Crawler Worker executes controlled page crawling for leased URL Frontier
work. It fetches or renders one approved URL at a time, normalizes crawl output
through a stable adapter contract and reports structured results back to the
Research Engine.

It answers:

- Which approved URL is being crawled?
- Which crawler adapter is allowed to execute the request?
- Which network, robots and resource limits apply?
- What normalized crawl result is returned to downstream systems?
- Which extracted links can be converted into new discovery observations?

This document is the accepted design contract. The initial Issue #5
implementation adds package-level command, adapter, result, selector and
normalization contracts plus worker command handling. Network crawling, concrete
HTTP/Crawl4AI/Playwright adapters, safe network gateway implementation, URL
Frontier persistence and Content Processing remain out of scope for the first
implementation slice.

## Boundaries

The Crawler Worker owns:

- Crawl attempt execution for leased URL Frontier work.
- Adapter selection for HTTP fetch, Crawl4AI, Playwright and future remote
  browser adapters.
- Safe network gateway enforcement for crawler requests.
- Robots policy evaluation for crawl attempts.
- Per-domain rate limits and browser/page concurrency limits.
- Request deadlines, byte limits, retry classification and cancellation.
- Adapter output normalization into a stable crawl result contract.
- Redirect, canonical, extracted-link and media metadata reporting.
- Crawl attempt observability and sanitized failure details.

The Crawler Worker does not own:

- Topic configuration authoring or lifecycle.
- URL discovery provider execution.
- URL normalization, candidate deduplication or crawl priority.
- Frontier lease selection, durable scheduling or recrawl decisions.
- Content versioning, chunking, embeddings or retrieval.
- Knowledge extraction, entity resolution or SEO generation.
- Crawl4AI, Playwright or other vendor DTOs outside adapter boundaries.
- General-purpose mirroring or archival crawling.

## Architecture

```txt
URL Frontier lease
  -> CrawlCommand
  -> CrawlPolicySnapshot
  -> RobotsPolicyService
  -> SafeNetworkGateway
  -> CrawlerAdapterSelector
  -> CrawlerAdapter
  -> CrawlResultNormalizer
  -> CrawlResultSink
       -> URL Frontier crawl-result boundary
       -> Discovery Sources extracted-link boundary
       -> future Content Processing boundary
```

PostgreSQL remains the source of truth for durable crawl attempt state. BullMQ
transports already leased crawl commands; Redis is not the durable crawl
registry.

## Crawl attempt input

The worker consumes a command created from a URL Frontier lease.

Required input:

| Field | Rules |
|---|---|
| `attemptId` | Stable crawl attempt identity. |
| `frontierEntryId` | Leased URL Frontier entry. |
| `topicId` | Owning Topic. |
| `topicConfigurationVersion` | Immutable Topic snapshot reference. |
| `normalizedUrl` | Frontier-normalized crawl identity. |
| `crawlPolicyFingerprint` | Policy fingerprint used when leasing. |
| `leaseExpiresAt` | Expiring Frontier lease boundary. |
| `policy` | Minimal request policy subset required for execution. |
| `deadline` | Absolute execution deadline; must not exceed `leaseExpiresAt`. |

The command must not include the full Topic configuration, database
repositories, credentials or unbounded provider metadata.

The effective abort deadline is:

```txt
min(deadline, leaseExpiresAt)
```

The worker must stop adapter execution no later than the lease expiry. A crawl
attempt that cannot finish before the lease expires must report `timed_out` or
let the Frontier expire the lease, rather than continuing to fetch after the
same entry may be re-queued.

## Attempt lifecycle

The durable lifecycle belongs to the URL Frontier. The Crawler Worker reports
transitions through a crawl-result boundary instead of independently mutating
priority or scheduling state.

```txt
leased
  -> running
  -> succeeded
  -> failed_retryable
  -> failed_terminal
  -> timed_out
  -> blocked_by_policy
  -> cancelled

leased/running -> queued after lease expiry by URL Frontier
```

- `leased`: Frontier selected the entry and created a bounded attempt.
- `running`: worker accepted the attempt before lease expiry.
- `succeeded`: adapter returned a usable crawl result.
- `failed_retryable`: transient transport, adapter or server failure.
- `failed_terminal`: unsupported content, invalid policy or exhausted budget.
- `timed_out`: deadline expired before a complete result.
- `blocked_by_policy`: robots, Topic policy or network safety denied crawling.
- `cancelled`: Topic pause/archive or operator cancellation interrupted work.

The worker may perform small adapter-internal retries only when they are
bounded, idempotent and completed within the original attempt deadline. Recrawl
timing and retry eligibility remain URL Frontier decisions.

## Adapter boundary

The Research Engine must not depend on a concrete crawling library. All crawler
implementations sit behind `CrawlerAdapter`.

Conceptual TypeScript contract:

```ts
interface CrawlerAdapter {
  readonly key: string;
  readonly version: string;
  readonly capabilities: CrawlerAdapterCapabilities;

  crawl(context: CrawlExecutionContext): Promise<CrawlAdapterResult>;
}
```

`CrawlExecutionContext` contains:

- Attempt ID and Frontier entry ID.
- Topic ID and configuration version.
- Original normalized URL.
- Effective request policy subset.
- Robots decision.
- Execution deadline and abort signal.
- Safe network gateway access.
- Adapter-specific bounded options.
- Trace context for logs and metrics.

It does not expose database repositories, the NestJS application container,
secret values or complete Topic configuration.

### Adapter implementations

Default adapter order is deployment configuration, not Topic configuration.

Expected adapters:

- `crawl4ai`: default rich crawler adapter when available.
- `http-fetch`: lightweight fast path for static HTML and metadata requests.
- `playwright`: fallback or custom browser path for JavaScript-heavy pages.
- `browserless`: future remote browser adapter.
- `wget`: explicit mirroring or archival utility only; not the normal crawler.

Crawl4AI is an implementation detail. Crawl4AI request and response DTOs must
not leak into URL Frontier, Discovery Sources, Content Processing or Topic
Engine contracts.

### Capability negotiation

Adapters declare capabilities before selection:

```txt
supportsJavaScriptRendering
supportsMarkdownExtraction
supportsPlainTextExtraction
supportsScreenshot
supportsNetworkIdle
supportsRobotsAwareFetch
maximumBodyBytes
maximumExecutionMs
```

The selector rejects incompatible adapter/policy combinations instead of
silently dropping requested rendering, timeout, language, byte or safety
constraints.

## Safe network gateway

All crawler adapters must use a shared safe network gateway or an equivalent
adapter-local enforcement layer reviewed against the same rules.

Rules:

- Permit only `http` and `https`.
- Parse URLs structurally, never by string prefix.
- Resolve internationalized hostnames with IDNA.
- Deny loopback, link-local, private, multicast and reserved network targets
  by default.
- Validate DNS/IP before connection and after each redirect.
- Bound redirect count and redirect chain length.
- Recheck Topic host/path policy after each redirect.
- Do not trust proxy environment variables implicitly.
- Disable `file:`, `data:`, `ftp:`, extension and browser-internal URLs.
- Bound request headers, response headers, body bytes and decompressed bytes.
- Bound total wall-clock time and idle time.
- Sanitize persisted headers and failure details.

Redirects cannot widen Topic policy. A redirect target that is outside policy
returns `blocked_by_policy` with structured evidence rather than continuing.

## Robots and politeness

Robots handling is part of crawl execution because robots decisions depend on
the final network target and user-agent.

Rules:

- Robots policy is configurable, but the default posture is to respect robots.
- Robots files are fetched through the safe network gateway.
- Robots decisions are cached per scheme, full authority and user-agent with
  bounded TTL. The authority includes the effective port, because different
  ports on the same host can serve different robots policies.
- Explicit `Disallow` rules produce `blocked_by_policy`.
- Robots fetch failures use a conservative configurable policy; the default is
  to avoid crawling when policy cannot be established.
- `Crawl-delay` is respected when compatible with deployment limits, otherwise
  the unsupported directive must be reported as policy evidence.
- Per-host and per-registered-domain rate limits apply before adapter
  execution.
- Browser concurrency is globally capped for the A1502 runtime profile.

The worker should prefer slow, bounded crawling over aggressive throughput.

## Crawl result contract

The normalized crawl result is the only output other subsystems consume.

Required fields:

| Field | Rules |
|---|---|
| `attemptId` | Required. |
| `frontierEntryId` | Required. |
| `topicId` | Required. |
| `requestedUrl` | Frontier-normalized input URL. |
| `finalUrl` | Final URL after redirects, if reached. |
| `statusCode` | HTTP status when available. |
| `headers` | Sanitized bounded header map. |
| `redirectChain` | Bounded ordered redirect evidence. |
| `canonicalUrl` | HTTP or HTML canonical candidate, if discovered. |
| `title` | Bounded page title, if extracted. |
| `metaDescription` | Bounded meta description, if extracted. |
| `rawHtml` | Optional bounded raw HTML artifact reference or payload. |
| `cleanedMarkdown` | Optional bounded cleaned Markdown artifact reference or payload. |
| `plainText` | Optional bounded text artifact reference or payload. |
| `contentHash` | Hash of effective crawl content when available. |
| `outgoingLinks` | Bounded extracted link observations. |
| `mediaAssets` | Metadata only; no binary download by default. |
| `timing` | DNS/connect/TTFB/download/render/extraction timing when available. |
| `adapter` | Adapter key and version. |
| `failure` | Structured sanitized failure, if not successful. |

Large raw HTML, Markdown and plain-text payloads may be represented as artifact
references once storage ownership is implemented. The contract must preserve
the ability to reprocess raw HTML later; code in Issue #5 does not implement
the content-processing pipeline.

## Extracted-link handoff

Crawler output feeds Discovery Sources through a structured extracted-link
batch. Discovery Sources convert accepted link observations into candidate
observations for the URL Frontier.

Conceptual batch:

```txt
LinkObservationBatch
  crawlAttemptId
  topicId
  topicConfigurationVersion
  referringFrontierEntryId
  referringRequestedUrl
  referringFinalUrl
  links[]
```

Each link contains:

| Field | Rules |
|---|---|
| `href` | Original bounded link target. |
| `resolvedUrl` | Absolute URL resolved against the final page URL. |
| `anchorText` | Bounded visible anchor text. |
| `rel` | Bounded rel tokens, including `nofollow` when present. |
| `sourceElement` | Optional bounded element hint. |
| `position` | Optional document-order position bucket. |
| `metadata` | Bounded provider-neutral JSON. |

The Crawler Worker extracts and reports links. It does not enqueue them
directly, deduplicate them or decide their crawl priority.

## Canonical and redirect evidence

Redirects and canonical tags are reported directly to the URL Frontier
crawl-result boundary.

The Crawler Worker does not consolidate canonical identities. The URL Frontier
decides whether redirect and canonical evidence is trusted for the current
Topic policy.

Canonical candidates include:

- Permanent redirect target.
- HTTP `Link: rel="canonical"` target.
- HTML canonical link target.

All candidates must pass structural URL validation and Topic policy checks
before they are reported as trusted evidence.

## Media metadata

Issue #5 records media metadata only. It does not download binary media assets.

Allowed metadata:

- Resolved media URL.
- Element type.
- Alt text or accessible label.
- Width and height hints.
- MIME type when known.
- Byte length when known from headers.
- Source position bucket.

Future media download or screenshot capture requires a separate accepted design
or explicit issue scope.

## Retry and failure categories

Retry decisions are communicated through structured failure categories. The URL
Frontier decides whether and when another crawl attempt should be scheduled.

Categories:

- `robots_denied`
- `unsafe_target`
- `policy_redirect_blocked`
- `dns_failure`
- `connection_failure`
- `network_timeout`
- `http_429`
- `http_5xx`
- `unsupported_content_type`
- `content_too_large`
- `decompression_limit`
- `browser_crash`
- `adapter_error`
- `cancelled`
- `internal_error`

Failure details are bounded and sanitized. They must not include credentials,
cookies, full response bodies or sensitive request headers.

## A1502 runtime profile

The target runtime is a secondary MacBook Pro A1502. The worker design favors
predictable local operation over throughput.

Initial conservative defaults:

- Very low global browser concurrency.
- Separate HTTP fetch concurrency from browser concurrency.
- Per-host and per-registered-domain rate limits.
- Bounded page count per Topic scheduling window.
- Bounded adapter deadline per attempt.
- Bounded body and decompressed body size.
- Queue backpressure before browser processes are saturated.
- No unbounded crawl expansion from extracted links.

Exact numeric defaults remain implementation details, but implementation must
document them in local crawling limits before review.

## Persistence direction

Planned durable state remains split by responsibility:

- URL Frontier owns frontier entries, leases and crawl attempt lifecycle.
- Crawler Worker may store adapter-run audit records if needed.
- Discovery Sources own extracted-link run ingestion if link batches become
  resumable.
- Content Processing owns document versions, normalized body storage and later
  reprocessing.

Likely future structures:

- `crawl_attempts` owned by URL Frontier.
- `crawler_adapter_runs` owned by Crawler Worker if adapter-level audit needs
  separate retention.
- Artifact storage references for raw HTML, cleaned Markdown and plain text
  once Content Processing storage is designed.

No schema is accepted by this design document alone.

## Observability

Metrics:

- Attempts by status and failure category.
- Adapter selection counts and fallback counts.
- Per-adapter latency and timeout rates.
- Robots cache hit/miss and denial counts.
- Redirect counts and policy-blocked redirects.
- Body byte, decompressed byte and extraction size distributions.
- Browser process/page concurrency.
- Per-host rate-limit wait time.
- Safe network gateway denials.

Logs use attempt ID, Frontier entry ID, Topic ID, configuration version, adapter
key and normalized host. Logs must not include credentials, cookies, full HTML,
full text payloads or unbounded query strings.

## Proposed implementation after design review

Initial implementation is allowed because Issue #5 design is approved.

Issue #5 implementation may add:

- `packages/crawler` for adapter and result contracts. Initial contracts are in
  place.
- Crawler Worker application services in `apps/crawler-worker`. Initial job
  command handling is in place.
- Safe network gateway and robots policy services.
- HTTP fetch, Crawl4AI and Playwright adapter boundaries.
- Crawl result normalization and sink integration contracts.
- Tests for successful crawl, timeout, retry classification, policy denial,
  duplicate/idempotent result reporting and safe network constraints.
- Documentation for safe local crawling limits.

No URL Frontier implementation, Content Processing pipeline, embedding work or
SEO generation belongs to Issue #5.

## Review questions

1. Should `http-fetch` run before `crawl4ai` as a fast path, or should Crawl4AI
   remain the default adapter for all HTML pages in the first implementation?
2. Should robots fetch failures fail closed by default, or allow a per-Topic
   override for exploratory crawling?
3. Should raw HTML be returned inline below a byte limit, or always persisted
   through an artifact reference once storage exists?
4. How much should the system trust adapter-provided cleaned Markdown before
   the Content Processing Pipeline exists?
5. Which numeric A1502 defaults should be accepted for first implementation
   review?
6. Should `nofollow` extracted links be emitted with metadata by default or
   filtered before Discovery Sources receives the batch?
