# SEO Page Candidate Scoring Model

- Status: Foundation complete for Issue #20
- Issue: #20
- Date: 2026-07-23

## Purpose

SEO Page Candidate Scoring ranks discovered page opportunities using observable
signals from Demand Engine, SERP Intelligence, SERP Intent Analyzer, Topic
Expansion, Long-tail Discovery and Knowledge Intelligence.

It answers:

```txt
Which candidate page opportunities should be reviewed first, and why?
```

It does not answer:

```txt
Which page is guaranteed to rank?
What is the exact business value of this page?
Is the whole topic complete?
Should content be generated automatically now?
```

Demand Engine owns demand candidates and optional metrics. Topic Expansion and
Long-tail Discovery own candidate discovery. SERP Intelligence and SERP Intent
Analyzer own SERP expectations and intent evidence. SEO Page Candidate Scoring
owns comparative prioritization and rationale metadata.

## Core Principle

Scoring ranks candidates; it does not create hard readiness gates.

The scoring layer must not produce fake topic coverage percentages, research
readiness percentages or knowledge completeness percentages. Scores are
ranking aids derived from observable signals, not truth claims.

## Boundaries

SEO Page Candidate Scoring owns:

- scoring input contracts;
- signal normalization;
- weighted scoring profiles;
- opportunity score output;
- confidence and rationale metadata;
- recommended page type hints;
- Focused Research hint output;
- degraded/fallback scoring behavior;
- repository abstraction.

SEO Page Candidate Scoring does not own:

- discovering demand candidates;
- discovering long-tail candidates;
- paid provider integrations;
- exact search volume, difficulty, CPC or traffic potential;
- SERP collection;
- crawling;
- content extraction;
- fact extraction;
- final publish approval;
- SEO Pack generation;
- content generation.

## Inputs

Initial inputs:

- Demand Engine keyword candidates, candidate pages and nullable metrics;
- SERP Pack expectations, depth hints and missing opportunities;
- SERP Intent Pack must-cover, recommended, opportunity and monitor intents;
- Topic Expansion candidates and clusters;
- Long-tail Discovery candidates and opportunity trees;
- Knowledge Pack evidence, source diversity, entities, facts and gaps;
- SEO Consensus conflict metadata when available;
- topic id, language and geo;
- optional provider metrics from future External SEO Data Providers (#40).

The first implementation can use simplified DTOs that mirror upstream pack
signals. Missing upstream packs should degrade confidence, not fail scoring.

## Scoring Signals

Initial signal types:

- `demand_strength`;
- `serp_weakness`;
- `content_gap`;
- `faq_gap`;
- `entity_gap`;
- `serp_volatility`;
- `competitor_similarity`;
- `knowledge_strength`;
- `topic_authority_potential`;
- `research_asset_availability`;
- `long_tail_specificity`;
- `provider_metric`;
- `unknown_metric_penalty`;

Signals such as `topic_authority_potential` and
`research_asset_availability` describe candidate-level prioritization evidence
only; they must not be used as site authority, topic completeness or publish
readiness claims.

Each signal should preserve:

- signal type;
- raw value;
- normalized score contribution;
- weight;
- rationale;
- confidence;
- supporting ids or source references;
- missing data warning when applicable.

## Opportunity Score

Opportunity Score is a relative ranking score for candidate comparison.

Initial output:

- numeric score in a bounded range;
- score band: `low`, `medium`, `high`;
- confidence: `unknown`, `low`, `medium`, `high`;
- rationale list;
- warnings;
- degraded/fallback state.

The numeric score should be deterministic and explainable. It should not be
presented as ranking probability, traffic forecast or publish readiness.

## Scoring Profiles

Scoring profiles allow different strategy weights without changing candidate
contracts.

Initial profiles:

- `default`;
- `fallback_first`;
- `authority_building`;
- `quick_win`;

Profiles should define:

- signal weights;
- missing-data handling;
- minimum evidence expectations;
- explanation labels;
- max score contribution per signal group.

Profiles must not hide hard gates. Low confidence should be visible in output.

## Recommended Page Type

Recommended page type should be inherited from upstream candidates when
available, then adjusted only when scoring evidence strongly supports it.

Initial page type hints:

- `landing_page`;
- `guide`;
- `faq_page`;
- `comparison_page`;
- `local_page`;
- `entity_page`;
- `supporting_page`;
- `update_existing`;

Scoring can recommend a type. It must not mutate upstream candidate ownership.

## Focused Research Hints

Focused Research hints tell downstream operators or agents what evidence should
be collected before writing.

Initial hints:

- missing SERP Pack;
- missing SERP Intent Pack;
- missing Knowledge Pack evidence;
- unresolved SEO Consensus conflict;
- missing provider metrics;
- weak source diversity;
- shallow competitor coverage needs verification;
- candidate needs Product Owner review.

Hints are not blocking gates unless a downstream workflow chooses to enforce
them.

## Scored Candidate

Initial fields:

- candidate key;
- topic id;
- candidate label;
- normalized concept;
- source candidate type;
- recommended page type;
- opportunity score;
- score band;
- confidence;
- signal contributions;
- rationale;
- focused research hints;
- warnings;
- degraded/fallback state;
- source pack references;
- rule version.

## Storage Model

Initial tables may be added later:

`seo_candidate_scoring_runs`:

- topic id;
- profile;
- source pack references;
- degraded state and warnings;
- rule version;
- created timestamp.

`seo_candidate_scores`:

- run id;
- candidate key;
- normalized concept;
- recommended page type;
- opportunity score;
- score band;
- confidence;
- rationale payload;
- focused research hints;
- signal contribution payload.

The first runtime PR may start with package contracts and repository
abstraction if it preserves these accepted contracts.

## Service Boundaries

Recommended package:

```txt
packages/seo-candidate-scoring
```

Implemented foundation package:

- `packages/seo-candidate-scoring/src/domain/seo-candidate-scoring-types.ts`
  defines scoring signals, profiles, scored candidates, Focused Research hints
  and Candidate Scoring Pack contracts.
- `packages/seo-candidate-scoring/src/candidate-signal.service.ts` normalizes
  raw signals into weighted score contributions.
- `packages/seo-candidate-scoring/src/opportunity-score.service.ts` calculates
  deterministic opportunity scores, bands and confidence.
- `packages/seo-candidate-scoring/src/focused-research-hint.service.ts`
  generates non-blocking Focused Research hints from missing or weak evidence.
- `packages/seo-candidate-scoring/src/candidate-scoring-pack.service.ts`
  assembles model-agnostic scored candidate output.
- `packages/seo-candidate-scoring/src/persistence/seo-candidate-scoring.repository.ts`
  defines the repository abstraction; concrete database persistence remains
  deferred.

Recommended services:

- `CandidateSignalService`: normalizes scoring inputs into weighted signals.
- `ScoringProfileService`: owns profile weights and missing-data behavior.
- `OpportunityScoreService`: calculates deterministic score and score band.
- `FocusedResearchHintService`: generates research hints from missing or weak
  signals.
- `CandidateScoringPackService`: assembles model-agnostic scored candidate
  outputs.
- `SeoCandidateScoringRepository`: persists scoring runs and scores when
  concrete persistence is introduced.

## Workflow

```txt
Demand Pack + SERP Pack + SERP Intent Pack + Topic Expansion Pack
  + Long-tail Discovery Pack + Knowledge Pack
  -> scoring signal normalization
  -> profile weighting
  -> opportunity score + confidence
  -> rationale + Focused Research hints
  -> scored candidates
  -> SEO Pack planning / operator review
```

The workflow must continue when provider metrics are missing. Missing paid
metrics lower confidence and add warnings; they must not block candidate
ranking.

## MVP Scope

The first implementation should include:

- `packages/seo-candidate-scoring`;
- scoring signal DTOs;
- scoring profile DTOs;
- scored candidate DTOs;
- deterministic default profile;
- opportunity score calculation;
- confidence and score band calculation;
- focused research hint generation;
- degraded/fallback behavior;
- repository abstraction;
- tests using Demand/SERP/Intent/Expansion/Long-tail/Knowledge-like fixtures;
- documentation and progress synchronization.

The first implementation should not include:

- paid provider integrations;
- concrete database persistence;
- operator UI;
- SEO Pack generation;
- content generation;
- automatic publish decisions;
- rank tracking.

## Definition Of Done

Issue #20 is complete when:

- scored candidate contracts exist. Done.
- scoring signal normalization exists. Done.
- deterministic scoring profile foundation exists. Done.
- opportunity score, confidence and rationale foundations are implemented. Done.
- Focused Research hints are generated from missing or weak evidence. Done.
- missing paid metrics do not block scoring. Done.
- scores are documented as ranking aids, not readiness percentages. Done.
- documentation, progress and project map are synchronized. Done.
