# Topic Expansion Engine Model

- Status: Foundation implementation in review for Issue #19
- Issue: #19
- Date: 2026-07-23

## Purpose

Topic Expansion Engine discovers adjacent SEO opportunities from existing
project knowledge, SERP evidence, demand candidates and SERP intent signals.

It answers:

```txt
What related page opportunities can we responsibly propose from what we know?
```

It does not answer:

```txt
What is the full long-tail universe for this niche?
Which keywords have exact provider-backed volume?
Which opportunity should be published first?
What final content should be generated?
```

Demand Engine owns keyword and candidate page discovery from demand sources.
SERP Intelligence owns SERP structure and SERP Packs. SERP Intent Analyzer owns
mandatory and opportunity intents. Topic Expansion turns these inputs, plus
Knowledge signals, into expansion candidates that can later be scored,
validated and packaged.

## Core Principle

Topic Expansion proposes candidates from evidence; it does not hallucinate a
complete topical map.

The first implementation should prefer fewer candidates with traceable
supporting signals over broad combinatorial generation.

## Boundary With Long-tail Discovery

Topic Expansion is not the future Long-tail Discovery Engine.

Topic Expansion owns:

- first-pass topic clusters;
- supporting page opportunities;
- FAQ page opportunities;
- entity page opportunities;
- comparison page opportunities;
- geo page opportunities when explicit geo evidence exists;
- candidate evidence summaries;
- expansion source tracking;
- degraded/fallback state when evidence is sparse.

Future Long-tail Discovery owns:

- large-scale entity and attribute combination generation;
- full opportunity trees;
- millions of potential long-tail combinations;
- advanced Opportunity Score;
- deeper Knowledge Graph combinatorics;
- broad long-tail prioritization beyond the first expansion pass.

Topic Expansion should produce reliable seeds for later long-tail work, not
replace that future subsystem.

## Boundaries

Topic Expansion owns:

- expansion candidate contracts;
- expansion cluster contracts;
- source signal aggregation from upstream packs;
- deterministic candidate generation rules;
- candidate type classification;
- evidence and warning propagation;
- repository abstraction.

Topic Expansion does not own:

- paid keyword provider integrations;
- exact search volume, difficulty, CPC or traffic potential;
- SERP snapshot collection;
- crawling;
- content extraction;
- fact extraction;
- SERP intent classification;
- final page scoring;
- SEO Pack generation;
- content generation.

## Inputs

Initial inputs:

- Demand Pack keyword candidates and candidate pages;
- SERP Pack recurring headings, FAQs, entities, depth and opportunity signals;
- SERP Intent Pack must-cover, recommended and opportunity intents;
- Knowledge Pack entities, aliases, facts, evidence gaps and source diversity;
- topic id, language and geo;
- optional operator seed constraints that filter or guide expansion but do not
  create unsupported candidates by themselves.

The first implementation can accept simplified DTOs that mirror these pack
signals without coupling tightly to every upstream package.

## Expansion Signals

Expansion signals are normalized observations that justify a candidate.

Initial signal types:

- `demand_candidate`;
- `serp_heading`;
- `serp_faq`;
- `serp_entity`;
- `serp_missing_opportunity`;
- `intent_opportunity`;
- `knowledge_entity`;
- `knowledge_alias`;
- `knowledge_fact`;
- `knowledge_gap`;
- `geo_hint`;

Each signal should preserve:

- source type;
- source label;
- normalized value;
- confidence;
- source diversity when available;
- supporting ids or result references when available.

## Candidate Types

Initial candidate page types:

- `supporting_page`;
- `faq_page`;
- `entity_page`;
- `comparison_page`;
- `geo_page`;
- `cluster_page`;
- `update_existing`;

Candidate types are suggestions, not publishing decisions. SEO Page Candidate
Scoring (#20) later owns prioritization.

## Expansion Candidate

Initial fields:

- candidate id or stable key;
- topic id;
- candidate type;
- primary label;
- normalized query or page concept;
- supporting labels;
- source signals;
- confidence;
- language and geo;
- evidence summary;
- warnings;
- status.

Initial statuses:

- `candidate`;
- `needs_validation`;
- `rejected`;
- `promoted`;

The first runtime foundation should create candidates, not mutate production
topic configuration or publish pages.

## Topic Cluster

Topic clusters group related candidates under a parent concept.

Initial fields:

- cluster key;
- parent label;
- normalized parent;
- child candidate keys;
- source signal counts;
- confidence;
- warnings.

Clusters should help downstream review and scoring. They are not a final site
architecture.

## Generation Rules

Initial deterministic rules:

- SERP Intent Pack `opportunity` intents can create supporting page candidates.
- SERP FAQ patterns can create FAQ page candidates.
- Knowledge Pack entities with enough evidence can create entity page
  candidates.
- Recurring SERP entities plus explicit geo hints can create geo page
  candidates.
- Comparison-like headings or intents can create comparison candidates.
- Demand Engine candidate pages can be carried forward as expansion candidates
  with demand-backed source signals.
- Low-evidence candidates must be marked `needs_validation`.

The engine must avoid unconstrained Cartesian products in Issue #19. Entity x
geo x procedure x FAQ combinations belong to the future Long-tail Discovery
Engine unless every dimension has explicit supporting evidence in the input.

## Expansion Pack

Expansion Pack is the model-agnostic output of this layer.

Initial fields:

- topic id;
- normalized topic label;
- language and geo;
- source pack references;
- clusters;
- candidates;
- warnings;
- degraded/fallback state;
- rule version.

Expansion Pack should feed future SEO Page Candidate Scoring, Topic Expansion
review UI and SEO Pack planning.

## Storage Model

Initial tables may be added later:

`topic_expansion_runs`:

- topic id;
- language/geo;
- source pack references;
- degraded state and warnings;
- rule version;
- created timestamp.

`topic_expansion_candidates`:

- run id;
- candidate key;
- candidate type;
- primary label;
- normalized concept;
- confidence;
- status;
- evidence payload.

`topic_expansion_clusters`:

- run id;
- cluster key;
- parent label;
- child candidate keys;
- confidence;
- evidence payload.

The first runtime PR may start with package contracts and repository
abstraction if it preserves these accepted contracts.

## Service Boundaries

Recommended package:

```txt
packages/topic-expansion
```

Implemented foundation package:

- `packages/topic-expansion/src/domain/topic-expansion-types.ts` defines
  expansion signals, candidates, clusters and Expansion Pack contracts.
- `packages/topic-expansion/src/expansion-signal.service.ts` normalizes and
  deduplicates upstream signals.
- `packages/topic-expansion/src/expansion-candidate.service.ts` generates
  deterministic first-pass expansion candidates from explicit signals.
- `packages/topic-expansion/src/expansion-cluster.service.ts` groups candidates
  into review/scoring-oriented clusters.
- `packages/topic-expansion/src/expansion-pack.service.ts` assembles the
  model-agnostic Expansion Pack.
- `packages/topic-expansion/src/persistence/topic-expansion.repository.ts`
  defines the repository abstraction; concrete database persistence remains
  deferred.

Recommended services:

- `ExpansionSignalService`: normalizes upstream pack signals.
- `ExpansionCandidateService`: generates candidate opportunities from signals.
- `ExpansionClusterService`: groups candidates into topic clusters.
- `ExpansionPackService`: assembles model-agnostic Expansion Packs.
- `TopicExpansionRepository`: persists runs, candidates and clusters when
  concrete persistence is introduced.

## Workflow

```txt
Demand Pack + SERP Pack + SERP Intent Pack + Knowledge Pack
  -> expansion signal normalization
  -> candidate generation
  -> cluster grouping
  -> Expansion Pack
  -> future scoring / review / SEO Pack planning
```

The workflow should continue in degraded mode when some packs are unavailable.
Missing paid provider metrics must never block expansion.

## MVP Scope

The first implementation should include:

- `packages/topic-expansion`;
- expansion signal DTOs;
- expansion candidate DTOs;
- topic cluster DTOs;
- Expansion Pack DTOs;
- deterministic rule foundations for FAQ, entity, comparison, geo and intent
  opportunity candidates, where geo and comparison candidates are emitted only
  when explicit supporting signals exist;
- degraded/fallback behavior;
- repository abstraction;
- tests with SERP Pack, SERP Intent Pack and Knowledge-like fixtures;
- documentation and progress synchronization.

The first implementation should not include:

- broad Long-tail Discovery Engine combinatorics;
- concrete database persistence;
- paid provider integrations;
- scheduling;
- operator UI;
- SEO Page Candidate Scoring;
- SEO Pack generation;
- content generation.

## Definition Of Done

Issue #19 is complete when:

- Expansion Pack contracts exist;
- deterministic signal normalization exists;
- candidate generation foundations are implemented;
- topic cluster foundations are implemented;
- unsupported broad long-tail combinatorics remain deferred;
- missing paid metrics do not block expansion;
- documentation, progress and project map are synchronized.
