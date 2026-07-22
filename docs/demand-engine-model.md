# Demand Engine Model

- Status: Runtime foundation done
- Issue: #72
- Runtime issue: #98
- Related ADR: `docs/decisions/0003-demand-engine-provider-optional.md`

## Purpose

The Demand Engine is the SEO Intelligence subsystem responsible for answering:

```txt
What should we write?
```

It turns a manually supplied topic, owned performance data, SERP-derived
signals, competitor signals, free discovery sources and optional paid SEO
provider data into candidate keywords, candidate topic clusters and candidate
pages.

The Demand Engine is intentionally narrower than an Ahrefs, Semrush or SE
Ranking clone. Its first responsibility is to provide a stable architecture
boundary for search-demand discovery and to prevent demand logic from spreading
across the Topic Engine, Discovery Sources, SERP Intelligence, Topic Expansion
and SEO Pack generation.

## Non-goals

The Demand Engine does not:

- crawl pages;
- own Topic lifecycle;
- replace the Knowledge Base;
- generate content;
- require Ahrefs, Semrush, SE Ranking or any other paid provider;
- pretend that fallback evidence is the same as provider-backed search volume;
- own final editorial approval of candidate pages.

## Design principle

Demand discovery must be provider-optional.

Paid providers improve confidence, scoring and prioritization. They must never
be required for the core pipeline to continue.

When paid SEO provider data is unavailable, the Demand Engine enters fallback
mode and continues with lower-confidence sources. Unknown metrics must remain
unknown rather than being fabricated.

## Provider tiers

### Tier 1: Paid demand providers

Examples:

- Ahrefs.
- Semrush.
- SE Ranking.
- Google Ads Keyword Planner.
- DataForSEO or equivalent SERP/keyword APIs.

These providers may supply:

- search volume;
- keyword difficulty;
- CPC;
- trends;
- seasonality;
- country and language demand;
- parent topics;
- competitor ranking keywords;
- top pages;
- SERP features.

### Tier 2: Owned data

Examples:

- Google Search Console.
- GA4.
- server logs.
- rank tracking history.
- first-party conversion or revenue data.

Owned data can validate real demand for an existing site and should be
preferred when it is available, but it is not always available for a new
project.

### Tier 3: Free and fallback discovery

Examples:

- manual seed topics and seed keywords;
- Google autocomplete;
- People Also Ask;
- related searches;
- SERP titles and snippets;
- competitor headings;
- competitor internal links;
- competitor sitemaps;
- FAQ blocks;
- forum, community or video suggestions when explicitly in scope;
- local Knowledge Graph entity and attribute combinations;
- already crawled corpus signals.

Fallback sources can discover meaningful long-tail opportunities but usually
cannot provide reliable volume, difficulty or CPC. Candidate confidence should
reflect this limitation.

## Core workflow

Example manual input:

```txt
laser hair removal
```

Targeting context supplied by the Topic Engine may include:

```txt
language: ru
country: PL
city: Warsaw
business type: clinic
```

The ideal workflow is:

```txt
Manual Topic Seed
  -> Topic Engine scope and policy
  -> Demand Engine discovery
  -> Candidate Keywords
  -> Keyword Clusters / Parent Topics
  -> Candidate Pages
  -> SERP and competitor validation
  -> Knowledge acquisition
  -> Knowledge Base
  -> Context Pack
  -> SEO Pack / Content Generation
```

## Candidate keyword model

The initial model should capture:

- normalized keyword text;
- original observed text;
- language;
- country and optional region/city;
- source tier;
- source provider;
- source query or seed;
- evidence URL or SERP observation when available;
- first seen and last seen timestamps;
- confidence;
- optional metrics.

Optional metrics include:

- search volume;
- keyword difficulty;
- CPC;
- trend;
- seasonality;
- traffic potential;
- parent topic;
- SERP feature observations.

Metrics from providers should be stored as snapshots with provider identity and
collection time. Missing metrics must remain nullable.

## Evidence and confidence

Fallback mode is useful only when the system is honest about evidence quality.

Initial confidence levels:

- `high`: provider-backed metrics or repeated owned-data evidence confirms
  demand for the same normalized keyword or cluster.
- `medium`: multiple independent fallback sources support the same candidate,
  such as autocomplete plus SERP snippets plus competitor page structure.
- `low`: one weak fallback source suggests the candidate, or the candidate is a
  Knowledge Graph combination that still needs validation.
- `unknown`: the candidate is retained for review but does not yet have enough
  evidence to support prioritization.

Initial source weighting should prefer:

1. Owned performance data for the same site and market.
2. Paid provider metrics with collection time and market scope.
3. Repeated SERP-derived evidence for the same market.
4. Competitor structure observed across multiple domains.
5. Single-source fallback evidence.
6. Generated Knowledge Graph combinations with no observed demand evidence.

Initial deduplication should normalize case, whitespace, punctuation variants,
language, country and optional region/city. The Demand Engine should preserve
the original observed text as evidence while grouping equivalent normalized
keywords.

Minimum evidence thresholds:

- Candidate keywords may be stored from a single source.
- Candidate pages should require either one provider-backed signal, one owned
  data signal, or at least two independent fallback evidence types.
- Candidates below the page threshold may remain keyword candidates, but should
  not become page candidates without review.

Unknown metrics must be explicit in Demand Packs:

```txt
volume: null
difficulty: null
cpc: null
trafficPotential: null
metricStatus: fallback_only
```

Do not replace unknown metrics with guessed numbers.

## Candidate page model

Candidate pages group keyword candidates into page opportunities.

The initial model should capture:

- proposed page intent;
- proposed page type;
- primary keyword candidate;
- supporting keyword candidates;
- market targeting;
- evidence summary;
- confidence;
- optional opportunity score;
- known missing metrics;
- existing page mapping;
- page action: new, update, merge, split or reject;
- cannibalization risk;
- cluster hierarchy;
- SERP page-type evidence;
- editorial priority;
- business priority;
- review state.

Example candidate pages for `laser hair removal`:

```txt
/laser-hair-removal/
/laser-hair-removal/price/
/laser-hair-removal/bikini/
/laser-hair-removal/warsaw/
/laser-hair-removal/contraindications/
/laser-hair-removal/diode-vs-alexandrite/
```

## Interaction with existing subsystems

### Topic Engine

The Topic Engine owns project scope, lifecycle, language/geo policy and seed
configuration.

The Demand Engine consumes Topic snapshots and proposes candidate keywords,
clusters and pages. It does not silently expand Topic scope beyond accepted
Topic policy.

### Discovery Sources

Discovery Sources execute URL-oriented discovery channels and emit URL
observations.

The Demand Engine may request SERP or competitor evidence through future
discovery/provider adapters, but it owns keyword candidates and demand
observations. Discovery Sources should not become the keyword database.

Fallback evidence ownership:

- Demand Engine owns keyword candidates, candidate pages, demand observations,
  metric snapshots, confidence and deduplication.
- Discovery Sources may fetch or normalize URL-oriented evidence such as SERP
  result URLs, competitor pages, sitemaps and internal links.
- SERP-specific providers may collect autocomplete, People Also Ask, related
  searches, SERP snippets and SERP features, but Demand Engine decides how
  those observations affect keyword candidates.
- Crawler Worker and Content Processing extract competitor headings, FAQ blocks
  and page structure after URL discovery and crawling.
- Refresh cadence for demand observations belongs to Demand Engine scheduling.
  Fetch execution may be delegated to provider adapters, Discovery Sources or
  SERP Intelligence depending on the source type.

### SERP Intelligence

SERP Intelligence records what the search results show for a query or topic.

The Demand Engine uses SERP evidence to validate candidate keywords and page
types. SERP Intelligence should not own keyword expansion, demand metrics or
candidate-page prioritization.

### Knowledge Base

The Knowledge Base explains what the system knows about entities, facts,
attributes, pages and sources.

The Demand Engine can use Knowledge Graph combinations to infer long-tail
candidate pages, especially in fallback mode. The Knowledge Base does not
replace demand confidence or provider metric snapshots.

### Codex and SEO Pack generation

Codex should receive demand context through structured packs, not direct
provider responses.

SEO generation should know:

- which keyword cluster or candidate page it is serving;
- which metrics are provider-backed;
- which signals are fallback-only;
- which assumptions need Product Owner or SEO Research Architect review.

## Fallback mode

Fallback mode is expected behavior, not an error state.

In fallback mode the system may:

- expand seed topics through autocomplete, related searches, PAA and SERP
  snippets;
- infer long-tail combinations from Knowledge Graph dimensions;
- extract candidate page patterns from competitor headings, URLs, sitemaps and
  internal links;
- mark metrics such as volume, difficulty and CPC as unknown;
- assign lower confidence where evidence is weak;
- continue to produce candidate pages for review.

Fallback mode must not:

- fabricate search volume;
- fabricate keyword difficulty;
- fabricate CPC;
- treat one scraped SERP as full demand validation;
- block downstream progress solely because paid
  provider credentials are absent.

## Minimal implementation scope

The first Demand Engine implementation should be intentionally small:

1. Domain model for keyword candidates and candidate pages.
2. Provider-optional adapter contracts.
3. Manual seed and fallback source ingestion.
4. Nullable metric snapshots.
5. Conversion from candidate keywords to candidate pages.
6. Explicit confidence and evidence fields.

Advanced clustering, paid provider integrations, rank tracking, SERP feature
history and sophisticated opportunity scoring can follow later.

## Implementation Notes

The runtime foundation package is `packages/demand-engine`.

The initial implementation:

- defines candidate keyword, candidate page, demand observation and nullable
  metric snapshot contracts;
- defines provider adapter contracts across provider tiers;
- includes a manual/free fallback provider;
- keeps missing paid provider data non-blocking;
- marks unknown volume, difficulty, CPC and traffic potential as `null`;
- promotes fallback candidate pages only when enough fallback evidence exists;
- exposes fallback mode and provider warnings explicitly.

## Review gates

Before Demand Engine runtime implementation begins:

- the SEO Research Architect must confirm the demand model is useful for SEO
  research;
- the Architecture Steward must confirm ownership boundaries with Topic Engine,
  Discovery Sources, SERP Intelligence and Knowledge Base;
- the Product Owner must confirm provider-optional behavior is required product
  behavior;
- `docs/implementation-order.md` and `docs/progress.md` must remain synchronized.

Issue #72 is a design-only architecture correction allowed before the runtime
implementation slot because it prevents roadmap drift in later SEO Intelligence
issues. Runtime implementation is tracked separately by Issue #98 and follows
`docs/implementation-order.md`.
