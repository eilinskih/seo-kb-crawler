# SERP Intent Analyzer Model

- Status: Foundation complete for Issue #30
- Issue: #30
- Date: 2026-07-23

## Purpose

SERP Intent Analyzer interprets SERP Pack evidence and decides which intents
are mandatory for relevance and which intents are opportunity areas for
differentiation.

It answers:

```txt
What must be covered for this page to satisfy the SERP?
What can be covered to outperform shallow competitors?
```

It does not answer:

```txt
Which keywords should we target?
Which competitor facts are true?
What final article should be generated?
How complete is the whole topic as a percentage?
```

Demand Engine owns keyword and candidate page discovery. SERP Intelligence owns
observable SERP patterns and SERP Packs. SERP Intent Analyzer owns intent
classification over those observed patterns. SEO Pack Generator later owns
generation-ready packaging.

## Core Principle

Cover mandatory intents before expanding into opportunity intents.

The analyzer must not produce fake topic coverage percentages, research
readiness percentages or universal knowledge completeness scores. Intent depth
and gaps are structured SERP signals derived from observed ranking pages and
Research Assets.

## Boundaries

SERP Intent Analyzer owns:

- intent candidate extraction from SERP Pack expectations;
- mandatory intent classification;
- opportunity intent classification;
- intent frequency summaries;
- intent depth summaries;
- intent gap summaries;
- SERP Intent Pack DTOs;
- supporting SERP evidence references;
- degraded/fallback state for incomplete SERP evidence.

SERP Intent Analyzer does not own:

- keyword discovery;
- search volume, difficulty, CPC or demand metrics;
- SERP snapshot collection;
- competitor crawling;
- fact extraction;
- source trust scoring;
- consensus decisions;
- final SEO Pack generation;
- content generation;
- rank tracking.

## Inputs

Initial inputs:

- SERP Pack from `packages/serp-intelligence`;
- normalized query;
- topic id when available;
- language and geo;
- recurring headings;
- recurring FAQ candidates;
- recurring entities;
- dominant and secondary content angles;
- content depth summary;
- SERP expectations;
- missing opportunities;
- degraded/fallback flags and warnings.

Future optional inputs:

- Demand Pack candidate page context;
- Knowledge Pack facts and evidence gaps;
- SEO Consensus conflict metadata;
- target page content when auditing an existing page.

The first implementation should operate from SERP Pack alone so it remains
useful before SEO Pack Generator exists.

## Intent Candidate

An intent candidate is a normalized meaning derived from observable SERP Pack
evidence.

Initial sources:

- recurring headings;
- FAQ patterns;
- recurring entities;
- content angle labels;
- missing opportunities from SERP Pack;
- repeated proof/structure expectations.

Initial fields:

- normalized intent key;
- display label;
- source expectation kind;
- source frequency;
- source diversity;
- supporting SERP result references;
- evidence source type;
- confidence.

The first implementation may use deterministic normalization and rule-based
grouping. Semantic clustering can follow after contracts are stable.

## Intent Classes

Core Intent:

- appears across most available ranking-page evidence;
- is strongly supported by source diversity;
- maps to recurring sections, FAQs, entities or proof structures;
- should be covered by generated content.

Opportunity Intent:

- appears rarely but has strong differentiation value;
- appears in SERP Pack missing opportunities;
- is shallowly covered by competitors;
- may expand content after mandatory intents are covered.

Unknown Intent:

- has insufficient evidence;
- comes from degraded/fallback SERP data;
- should not be treated as mandatory.

## Intent Frequency

Intent frequency measures how often an intent appears across observed SERP
evidence.

Frequency inputs:

- occurrence count;
- source diversity;
- result positions;
- expectation kind;
- SERP Pack sample size.

Frequency must be reported as structured evidence, not as universal topic
coverage.

## Intent Depth

Intent depth estimates how deeply competitors satisfy an intent.

Initial depth signals:

- heading level and repeated section presence;
- FAQ presence;
- related entity presence;
- content depth hints from SERP Pack;
- supporting result count;
- structure hints such as table/list/comparison usage.

Depth values should be qualitative:

- `unknown`;
- `shallow`;
- `moderate`;
- `deep`.

Depth is a SERP-relative signal. It is not proof that the subject is complete.

## Intent Gap

Intent gap describes how the platform should treat an intent.

Initial gap classes:

- `must_cover`: mandatory intent with strong frequency/diversity support;
- `recommended`: useful intent with moderate support;
- `opportunity`: under-covered or differentiating intent;
- `monitor`: weak or degraded evidence;
- `ignore`: irrelevant or unsupported.

For the first implementation, `must_cover` and `opportunity` are the critical
outputs. Other classes may help downstream prioritization without blocking
MVP behavior.

## SERP Intent Pack

SERP Intent Pack is the model-agnostic output of this layer.

Initial pack fields:

- normalized query;
- topic id;
- language and geo;
- source SERP Pack reference or snapshot ids;
- `mustCover` intents;
- `recommended` intents;
- `opportunity` intents;
- `monitor` intents;
- degraded/fallback state;
- warnings;
- rule version.

Each intent should preserve:

- intent key;
- display label;
- class;
- frequency;
- source diversity;
- depth;
- gap;
- confidence;
- supporting SERP result references;
- source expectation kinds.

## Classification Rules

Initial deterministic rules:

- high source diversity and repeated frequency classify as `must_cover`;
- FAQ and heading overlap can strengthen mandatory confidence;
- entity-only evidence should not become mandatory without section/FAQ support;
- missing opportunities from SERP Pack classify as `opportunity` unless they
  also meet mandatory frequency/diversity rules;
- degraded SERP Packs lower confidence and should avoid new mandatory intents;
- low-evidence intents remain `monitor`.

Thresholds should be explicit configuration values, not hidden constants.

Suggested MVP defaults:

- minimum source diversity for `must_cover`: 2;
- minimum frequency for `must_cover`: 2;
- minimum confidence for `must_cover`: `medium`;
- degraded SERP Pack forces new mandatory intents to at most `recommended`.

## Storage Model

Initial tables may be added later:

`serp_intent_packs`:

- normalized query, topic/language/geo;
- source SERP Pack ids;
- intent payload;
- degraded state and warnings;
- rule version;
- created timestamp.

`serp_intent_observations`:

- intent pack id;
- intent key and label;
- class;
- frequency;
- source diversity;
- depth;
- gap;
- confidence;
- supporting result ids.

The first runtime PR may start with package contracts and repository
abstraction only if it preserves these accepted contracts.

## Service Boundaries

Recommended package:

```txt
packages/serp-intent
```

Implemented foundation package:

- `packages/serp-intent/src/domain/serp-intent-types.ts` defines SERP Intent
  Pack, intent candidate, intent classification, depth, gap, confidence and
  configuration contracts.
- `packages/serp-intent/src/intent-candidate.service.ts` extracts normalized
  candidates from SERP Pack expectations, missing opportunities and content
  angle signals.
- `packages/serp-intent/src/intent-depth.service.ts` and
  `packages/serp-intent/src/intent-gap.service.ts` provide deterministic depth
  and must-cover/opportunity classification rules.
- `packages/serp-intent/src/serp-intent-pack.service.ts` assembles the
  model-agnostic SERP Intent Pack.
- `packages/serp-intent/src/persistence/serp-intent.repository.ts` defines the
  repository abstraction; concrete database persistence remains deferred.

Recommended services:

- `IntentCandidateService`: extracts normalized intent candidates from SERP
  Pack expectations.
- `IntentFrequencyService`: computes frequency and source diversity signals.
- `IntentDepthService`: classifies SERP-relative depth.
- `IntentGapService`: maps candidates to must-cover, recommended, opportunity,
  monitor or ignore decisions.
- `SerpIntentPackService`: assembles model-agnostic SERP Intent Packs.
- `SerpIntentRepository`: persists intent packs and observations when concrete
  persistence is introduced.

## Workflow

```txt
SERP Pack
  -> intent candidate extraction
  -> frequency/depth/gap analysis
  -> mandatory/opportunity classification
  -> SERP Intent Pack
  -> future Topic Expansion / Scoring / SEO Pack
```

The workflow is intentionally downstream of SERP Intelligence. If SERP Pack
data is missing or degraded, downstream consumers should continue with lower
confidence rather than failing the pipeline.

## MVP Scope

The first implementation should include:

- `packages/serp-intent`;
- SERP Intent Pack DTOs;
- intent candidate DTOs;
- deterministic candidate extraction from SERP Pack expectations;
- explicit classification thresholds;
- deterministic frequency, depth and gap classification;
- degraded/fallback behavior;
- repository abstraction;
- tests using SERP Pack fixtures;
- documentation and progress synchronization.

The first implementation should not include:

- semantic intent clustering;
- concrete database persistence;
- live SERP provider integrations;
- target page auditing;
- SEO Pack Generator runtime;
- Topic Expansion runtime;
- content generation.

## Definition Of Done

Issue #30 is complete when:

- SERP Intent Pack contracts exist. Done.
- deterministic candidate extraction exists. Done.
- frequency, depth and gap foundations are implemented. Done.
- must-cover and opportunity classifications are explicit. Done.
- degraded/fallback SERP state prevents false mandatory intent claims. Done.
- SERP Intelligence and SEO Pack Generator boundaries remain separate. Done.
- documentation, progress and project map are synchronized. Done.
