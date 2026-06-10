# Topic Engine Model

- Status: Architecture review passed; awaiting PR merge
- Issue: #2
- Date: 2026-06-10

## Purpose

The Topic Engine defines what the system should discover and crawl. It is the
configuration authority for topic scope, language and geographic targeting,
crawl safety limits and deterministic relevance signals.

This document is a design contract. Implementation must not begin until the
document receives human review.

## Boundaries

The Topic Engine owns:

- Topic lifecycle and invariants.
- Discovery intent and source configuration.
- Language and geographic targets.
- Crawl policy constraints.
- Relevance profile configuration.
- Optional intent profile configuration.
- Validation and versioning of topic configuration.

The Topic Engine does not own:

- URL queue state, scheduling or deduplication. Those belong to Issue #3.
- Discovery provider implementations. Those belong to Issue #4.
- HTTP crawling or browser execution. Those belong to Issue #5.
- Content parsing, chunking, embeddings or retrieval.
- Entity resolution or ontology definitions.

## Topic aggregate

`Topic` is the aggregate root. All configuration changes are validated and
persisted through the aggregate so downstream workers never receive a
partially valid topic.

### Fields

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Immutable, generated once. |
| `slug` | string | Immutable, unique, lowercase kebab-case, 3-80 characters. |
| `name` | string | Required, trimmed, 3-160 characters. |
| `description` | string or null | Optional, maximum 2,000 characters. |
| `status` | enum | `draft`, `active`, `paused`, or `archived`. |
| `discovery` | `DiscoveryConfiguration` | Versioned configuration value object. |
| `languageGeo` | `LanguageGeoModel` | Required targeting value object. |
| `crawlPolicy` | `CrawlPolicy` | Required safety and scope value object. |
| `relevanceProfile` | `RelevanceProfile` | Required deterministic scoring value object. |
| `intentProfile` | `IntentProfile` or null | Optional SEO intent weighting for future intelligence layers. |
| `configurationVersion` | positive integer | Incremented on every accepted configuration change. |
| `createdAt` | UTC timestamp | Immutable. |
| `updatedAt` | UTC timestamp | Updated with aggregate changes. |
| `activatedAt` | UTC timestamp or null | Set on first activation. |
| `archivedAt` | UTC timestamp or null | Set when archived. |

### Lifecycle

```txt
draft -> active -> paused -> active
  |        |         |
  +--------+---------+-> archived
```

- `draft` allows configuration editing but cannot produce discovery work.
- `active` may produce discovery work and crawl-policy snapshots.
- `paused` preserves configuration and history but produces no new work.
- `archived` is terminal and read-only.

Activation requires:

- At least one enabled discovery channel.
- At least one language target.
- A valid crawl policy with bounded page and request limits.
- A relevance profile with a valid acceptance threshold.
- No conflict between discovery scope and crawl allow/deny rules.

### Aggregate operations

- `createDraft`
- `rename`
- `replaceDiscoveryConfiguration`
- `replaceLanguageGeoModel`
- `replaceCrawlPolicy`
- `replaceRelevanceProfile`
- `replaceIntentProfile`
- `clearIntentProfile`
- `activate`
- `pause`
- `resume`
- `archive`

Configuration value objects are replaced atomically. Partial mutation of nested
configuration is not exposed by the domain model.

Every accepted operation increments `configurationVersion`, except lifecycle
operations that do not change configuration. Persistence uses optimistic
concurrency to reject updates based on a stale version.

## Discovery configuration schema

Discovery configuration expresses intent without depending on a search, sitemap
or crawling vendor.

```json
{
  "schemaVersion": 1,
  "search": {
    "enabled": true,
    "queries": [
      {
        "text": "technical seo crawling",
        "language": "en",
        "geo": {
          "countryCode": "US"
        }
      }
    ],
    "maxResultsPerQuery": 50
  },
  "sitemaps": {
    "enabled": true,
    "urls": [
      "https://example.com/sitemap.xml"
    ]
  },
  "seeds": {
    "enabled": true,
    "urls": [
      "https://example.com/guides/"
    ]
  }
}
```

### Root rules

- `schemaVersion` starts at `1` and is required.
- At least one channel must be enabled before activation.
- Unknown schema versions are rejected, not silently coerced.
- URLs must use `http` or `https`.
- Duplicate queries and URLs are normalized and rejected or removed before
  persistence.
- Secrets and provider credentials are never stored in topic configuration.

### Search channel

| Field | Type | Rules |
|---|---|---|
| `enabled` | boolean | Disabled channels retain configuration but emit no work. |
| `queries` | array | 1-100 entries when enabled. |
| `queries[].text` | string | 2-300 characters after normalization. |
| `queries[].language` | BCP 47 tag or null | Must be included in topic language targets. |
| `queries[].geo` | geo target or null | Must be compatible with topic geo targets. |
| `maxResultsPerQuery` | integer | 1-100, default 20. |

Search configuration defines queries only. Provider selection, credentials,
pagination and rate limits belong to Discovery Sources.

### Sitemap channel

| Field | Type | Rules |
|---|---|---|
| `enabled` | boolean | Requires at least one URL when enabled. |
| `urls` | URL array | Maximum 100 unique sitemap URLs. |

Nested sitemap traversal limits belong to the future sitemap provider, but all
emitted URLs remain constrained by the topic crawl policy.

### Seed channel

| Field | Type | Rules |
|---|---|---|
| `enabled` | boolean | Requires at least one URL when enabled. |
| `urls` | URL array | Maximum 500 unique seed URLs. |

Seeds are discovery inputs, not guaranteed crawl jobs. They still pass through
relevance evaluation and the URL Frontier.

## Language and geo model

Language and geography are separate dimensions. A language does not imply a
country, and a country does not imply a single language.

```json
{
  "languages": [
    {
      "tag": "en",
      "role": "primary",
      "minimumConfidence": 0.8
    },
    {
      "tag": "pl",
      "role": "secondary",
      "minimumConfidence": 0.85
    }
  ],
  "geoTargets": [
    {
      "countryCode": "US",
      "regionCode": null,
      "priority": 100
    },
    {
      "countryCode": "PL",
      "regionCode": null,
      "priority": 80
    }
  ],
  "geoMode": "targeted"
}
```

### Language target

- `tag` uses a canonical BCP 47 language tag.
- Exactly one language has role `primary`.
- Other languages use role `secondary`.
- Duplicate canonical tags are rejected.
- `minimumConfidence` is between `0` and `1`; default `0.8`.
- Language detection confidence is metadata. Low-confidence content is not
  silently assigned to the primary language.

### Geo target

- `countryCode` uses uppercase ISO 3166-1 alpha-2.
- `regionCode`, when present, uses ISO 3166-2 and must match `countryCode`.
- `priority` is an integer from `0` to `100`.
- City-level targeting is deferred until a concrete discovery or retrieval use
  case requires it.

### Geo mode

- `global`: no country filtering; `geoTargets` must be empty.
- `targeted`: one or more geo targets are required.

Geo targets guide discovery, relevance and later retrieval. They do not prove
that a document is legally or factually applicable to a location.

## Crawl policy model

The crawl policy is a declarative safety envelope. The URL Frontier and Crawler
Worker must enforce a versioned snapshot of this policy.

```json
{
  "allowedHosts": [
    "example.com",
    "*.example.org"
  ],
  "deniedHosts": [],
  "includedPathPatterns": [
    "/guides/**"
  ],
  "excludedPathPatterns": [
    "/account/**",
    "/checkout/**"
  ],
  "maxDepth": 3,
  "maxPages": 5000,
  "maxRequestsPerMinutePerHost": 20,
  "maxConcurrentRequestsPerHost": 2,
  "requestTimeoutMs": 30000,
  "maxResponseBytes": 10485760,
  "allowedContentTypes": [
    "text/html",
    "application/xhtml+xml"
  ],
  "robotsPolicy": "strict",
  "renderMode": "auto",
  "recrawlIntervalHours": 168
}
```

### Scope rules

- `allowedHosts` is required and contains 1-500 normalized host patterns.
- Host patterns support exact hosts and a leading `*.` wildcard only.
- IP literals, localhost and private network ranges are rejected by default.
- `deniedHosts` always overrides `allowedHosts`.
- Excluded paths always override included paths.
- Path patterns match URL paths, never full URLs or query strings.

### Resource limits

| Field | Allowed range | Default |
|---|---:|---:|
| `maxDepth` | 0-10 | 2 |
| `maxPages` | 1-1,000,000 | 1,000 |
| `maxRequestsPerMinutePerHost` | 1-120 | 10 |
| `maxConcurrentRequestsPerHost` | 1-8 | 2 |
| `requestTimeoutMs` | 1,000-120,000 | 30,000 |
| `maxResponseBytes` | 1 MiB-50 MiB | 10 MiB |
| `recrawlIntervalHours` | 1-8,760 | 168 |

### Behavior

- `robotsPolicy` is `strict` in schema version 1. Disabling robots enforcement
  is not supported.
- `renderMode` is `never`, `auto`, or `always`.
- `auto` permits browser rendering only after the HTTP adapter determines that
  static HTML is insufficient.
- Query parameter normalization and canonical URL rules belong to the URL
  Frontier, but must not widen this policy.
- Redirect targets are revalidated against the policy before following.

## Relevance profile model

The initial relevance profile is deterministic and explainable. Embeddings may
be added as a later signal, but never become the sole source of truth.

```json
{
  "minimumScore": 0.65,
  "requiredTermGroups": [
    [
      "seo",
      "search engine optimization"
    ]
  ],
  "excludedTerms": [
    "casino bonus"
  ],
  "weightedTerms": [
    {
      "term": "crawler",
      "weight": 0.8
    },
    {
      "term": "technical audit",
      "weight": 0.6
    }
  ],
  "fieldWeights": {
    "url": 0.15,
    "title": 0.3,
    "headings": 0.25,
    "body": 0.2,
    "anchorText": 0.1
  },
  "hostAdjustments": [
    {
      "host": "developers.google.com",
      "adjustment": 0.15
    }
  ]
}
```

### Rules

- Scores are normalized to the range `0` to `1`.
- `minimumScore` is between `0` and `1`.
- Every required term group is OR within the group and AND across groups.
- An excluded term causes deterministic rejection when matched under the
  configured normalization rules.
- Weighted terms use weights from `-1` to `1`.
- Field weights are non-negative and must sum to `1`.
- Host adjustments range from `-0.5` to `0.5`.
- Duplicate normalized terms and contradictory required/excluded terms are
  rejected.
- Matching is case-insensitive and Unicode-normalized.
- The scorer must return both a score and an explanation containing matched
  signals, exclusions and field contributions.

The same profile can score discovery candidates with partial fields and
processed documents with full fields. Missing fields contribute zero and are
reported in the explanation.

## Intent profile model

The optional intent profile records the expected SEO intent mix for a topic. It
is metadata for future SERP Intelligence, page candidate scoring and SEO Pack
generation. It does not alter crawling or relevance acceptance in Issue #2.

```json
{
  "informational": 0.7,
  "commercial": 0.2,
  "navigational": 0.1
}
```

Rules:

- The entire profile is optional.
- Supported schema version 1 keys are `informational`, `commercial`,
  `navigational` and `transactional`.
- Omitted keys have weight `0`.
- Each weight is between `0` and `1`.
- The normalized weights must sum to `1`.
- Intent weights are planning preferences, not claims about observed SERP
  composition.
- Observed intent signals from future SERP snapshots remain separate data and
  may differ from the configured profile.

## Configuration snapshots

Downstream jobs reference:

```txt
topicId
topicConfigurationVersion
```

The worker resolves an immutable configuration snapshot for that version. A
topic edit does not retroactively change already queued work. The URL Frontier
may supersede stale work explicitly in Issue #3, but must never silently apply a
new policy to an old job.

## Persistence direction

The planned persistence model is:

- Relational columns for identity, slug, lifecycle, version and timestamps.
- Versioned JSONB documents for discovery, language/geo, crawl policy and
  relevance and optional intent profiles.
- Database constraints for top-level lifecycle and uniqueness.
- Domain validation for cross-field invariants.
- Historical configuration snapshots retained for queued-work reproducibility.

Exact tables and migrations are implementation details to be proposed after
this document is reviewed.

The monorepo and persistence strategy is defined in
`docs/decisions/0002-nestjs-monorepo-knex.md`.

## Security and performance constraints

- Topic input is untrusted and must be validated before persistence.
- URLs are parsed structurally; string-prefix host validation is forbidden.
- Private network and loopback targets are denied by default to reduce SSRF
  risk.
- Regex input from users is not supported in schema version 1; bounded glob
  patterns avoid catastrophic backtracking.
- Collection sizes and string lengths are bounded.
- Configuration is cached by `(topicId, configurationVersion)`.
- Secrets, provider API keys and authentication cookies are referenced through
  external configuration, never embedded in a Topic.

## Proposed implementation after review

After approval, Issue #2 may add:

- `packages/topic-engine`.
- Domain entities, value objects and validation errors.
- Serialization schemas and DTO mapping.
- PostgreSQL migrations and repository adapter.
- NestJS module and API endpoints required to create and manage topics.
- Unit and integration tests for lifecycle, invariants and persistence.

No URL Frontier, discovery provider or crawler behavior is included in Issue
#2.

## Review questions

1. Should archived topics be restorable, or remain terminal as proposed?
2. Are host allowlists mandatory for every topic, including global research
   topics?
3. Should schema version 1 support city-level geo targeting?
4. Is deterministic term scoring sufficient for Issue #2, with semantic
   relevance deferred to the embedding and retrieval phases?
5. Should configuration history be stored as full snapshots or append-only
   domain events?
