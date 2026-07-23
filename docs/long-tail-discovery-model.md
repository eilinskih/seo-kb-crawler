# Long-tail Discovery Engine Model

- Status: Design proposed for Issue #134
- Issue: #134
- Date: 2026-07-23

## Purpose

Long-tail Discovery Engine derives evidence-backed long-tail page opportunities
from Demand Engine candidates, Topic Expansion seeds, SERP evidence, SERP
intent signals and Knowledge Graph dimensions.

It answers:

```txt
Which specific long-tail page opportunities can we infer from known entities,
attributes, SERP patterns and intent evidence?
```

It does not answer:

```txt
Which candidate has the highest business value?
What exact search volume or keyword difficulty does this query have?
What final page should be generated?
What is the entire infinite keyword universe?
```

Demand Engine owns demand candidates and provider-backed metrics. Topic
Expansion owns first-pass adjacent expansion candidates. Long-tail Discovery
owns bounded, explainable entity/attribute combinations that turn accumulated
knowledge into specific page opportunities. SEO Page Candidate Scoring (#20)
later owns prioritization.

## Core Principle

Generate long-tail opportunities only when every generated dimension has
supporting evidence.

Long-tail Discovery must not become uncontrolled Cartesian keyword generation.
It should produce fewer, explainable candidates with traceable support rather
than large opaque keyword lists.

## Boundaries

Long-tail Discovery owns:

- long-tail dimension contracts;
- dimension evidence contracts;
- combination rule contracts;
- bounded combination generation;
- long-tail opportunity tree contracts;
- Long-tail Discovery Pack DTOs;
- provider-optional metric placeholders;
- confidence and warning propagation;
- repository abstraction.

Long-tail Discovery does not own:

- paid keyword provider integrations;
- exact search volume, difficulty, CPC or traffic potential;
- broad candidate prioritization;
- SEO Page Candidate Scoring;
- SERP collection;
- crawling;
- fact extraction;
- final SEO Pack generation;
- content generation;
- operator UI.

## Inputs

Initial inputs:

- Demand Engine keyword candidates and candidate pages;
- Topic Expansion candidates and clusters;
- SERP Pack recurring headings, FAQ patterns, entities and missing
  opportunities;
- SERP Intent Pack must-cover and opportunity intents;
- Knowledge Pack entities, aliases, facts and evidence gaps;
- topic id, language and geo;
- optional provider metrics when available.

The first implementation can accept simplified input DTOs that mirror upstream
signals. It should not depend on concrete database persistence from upstream
packages.

## Dimensions

Dimensions are typed knowledge axes that can participate in long-tail
combinations.

Initial dimension types:

- `city`;
- `procedure`;
- `body_part`;
- `gender`;
- `price`;
- `season`;
- `technology`;
- `contraindication`;
- `faq`;
- `aftercare`;
- `comparison`;
- `intent`;

Each dimension value must preserve:

- dimension type;
- label;
- normalized value;
- source signals;
- confidence;
- source diversity when available;
- supporting ids or SERP references.

## Combination Rules

Combination rules define which dimensions may be combined.

Initial supported rules:

- `city x procedure`;
- `city x procedure x body_part`;
- `technology x body_part`;
- `procedure x contraindication`;
- `procedure x faq`;
- `procedure x aftercare`;
- `procedure x price`;
- `procedure x comparison`;

Rules must be explicit. The engine must not combine every available dimension
with every other dimension.

Each rule should define:

- required dimension types;
- optional dimension types;
- required compatibility or co-occurrence evidence between dimensions;
- maximum output count;
- minimum confidence;
- minimum evidence count;
- degraded/fallback behavior;
- candidate page type hint.

## Candidate

Initial long-tail candidate fields:

- candidate key;
- topic id;
- normalized query or concept;
- display label;
- participating dimensions;
- source signals;
- evidence summary;
- metric snapshot when available;
- missing metrics;
- confidence;
- warnings;
- candidate page type hint;
- status.

Initial statuses:

- `candidate`;
- `needs_validation`;
- `rejected`;
- `promoted` (downstream status set by review/scoring consumers, not by the
  initial Long-tail generator);

Long-tail candidates are not final publish decisions. SEO Page Candidate
Scoring (#20) decides priority later.

## Opportunity Tree

Opportunity trees group candidates under topic/dimension paths.

Example:

```txt
laser hair removal
  -> city: Warsaw
    -> body part: bikini
    -> body part: face
  -> technology: diode
    -> body part: legs
  -> contraindication: pregnancy
```

Initial tree fields:

- root topic label;
- path nodes;
- child candidate keys;
- supporting signal counts;
- confidence;
- warnings.

Trees are review structures, not final site architecture.

## Long-tail Discovery Pack

Long-tail Discovery Pack is the model-agnostic output of this layer.

Initial fields:

- topic id;
- normalized topic label;
- language and geo;
- source pack references;
- dimensions;
- combination rules applied;
- opportunity trees;
- candidates;
- warnings;
- degraded/fallback state;
- rule version.

The pack should feed SEO Page Candidate Scoring and later SEO Pack planning.

## Fallback Mode

Fallback mode is expected behavior.

Without paid provider metrics, Long-tail Discovery should:

- continue generating candidates from explicit local evidence;
- mark search volume, difficulty, CPC and traffic potential as unknown;
- lower confidence when evidence is weak;
- preserve warnings about missing provider-backed metrics;
- avoid upgrading low-evidence combinations to publish-ready status.

Paid providers can improve prioritization later, but they must never be
required for candidate generation.

## Safeguards

Required safeguards:

- hard maximum candidates per run;
- maximum candidates per combination rule;
- minimum evidence threshold per dimension;
- explicit rule allow-list;
- no recursive expansion in the MVP;
- no generated candidate without supporting evidence for every dimension and
  either co-occurrence, compatibility or explicit rule-level support for the
  dimension combination;
- degraded runs must not emit high-confidence candidates.

These safeguards are part of the architecture, not implementation details.

## Storage Model

Initial tables may be added later:

`long_tail_discovery_runs`:

- topic id;
- language/geo;
- source pack references;
- degraded state and warnings;
- rule version;
- created timestamp.

`long_tail_dimensions`:

- run id;
- dimension type;
- normalized value;
- label;
- confidence;
- evidence payload.

`long_tail_candidates`:

- run id;
- candidate key;
- normalized concept;
- participating dimensions;
- candidate page type hint;
- confidence;
- metric snapshot;
- missing metrics;
- status;
- evidence payload.

`long_tail_opportunity_trees`:

- run id;
- tree key;
- root label;
- path payload;
- child candidate keys;
- confidence;
- evidence payload.

The first runtime PR may start with package contracts and repository
abstraction if it preserves these accepted contracts.

## Service Boundaries

Recommended package:

```txt
packages/long-tail-discovery
```

Recommended services:

- `LongTailDimensionService`: extracts and normalizes dimensions from upstream
  signals.
- `CombinationRuleService`: owns explicit allow-listed combination rules and
  safeguards.
- `LongTailCandidateService`: generates bounded, evidence-backed candidates.
- `OpportunityTreeService`: groups candidates into reviewable opportunity
  trees.
- `LongTailDiscoveryPackService`: assembles model-agnostic Long-tail Discovery
  Packs.
- `LongTailDiscoveryRepository`: persists runs, dimensions, candidates and
  trees when concrete persistence is introduced.

## Workflow

```txt
Demand Pack + Topic Expansion Pack + SERP Pack + SERP Intent Pack + Knowledge Pack
  -> dimension extraction
  -> explicit rule selection
  -> bounded combination generation
  -> opportunity tree assembly
  -> Long-tail Discovery Pack
  -> SEO Page Candidate Scoring
```

The workflow must continue when provider metrics are missing. Missing paid
metrics affect confidence and prioritization, not whether the pipeline can run.

## MVP Scope

The first implementation should include:

- `packages/long-tail-discovery`;
- dimension DTOs;
- combination rule DTOs;
- long-tail candidate DTOs;
- opportunity tree DTOs;
- Long-tail Discovery Pack DTOs;
- explicit rule allow-list;
- bounded deterministic combination generation;
- provider-optional metric placeholders;
- degraded/fallback behavior;
- repository abstraction;
- tests using Demand/Topic Expansion/SERP/Intent/Knowledge-like fixtures;
- documentation and progress synchronization.

The first implementation should not include:

- paid provider integrations;
- concrete database persistence;
- recursive or unbounded long-tail expansion;
- SEO Page Candidate Scoring;
- SEO Pack generation;
- content generation;
- operator UI.

## Definition Of Done

Issue #134 is complete when:

- Long-tail Discovery Pack contracts exist;
- dimension extraction foundations are implemented;
- explicit combination rules and safeguards exist;
- bounded candidate generation exists;
- opportunity tree foundations are implemented;
- missing paid metrics do not block generation;
- broad prioritization remains deferred to #20;
- documentation, progress and project map are synchronized.
