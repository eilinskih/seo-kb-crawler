# SEO Consensus And Conflict Model

- Status: Knowledge Pack consensus consumption in review for Issue #16
- Issue: #16
- Date: 2026-07-23

## Purpose

SEO Consensus and Conflict Layer detects agreement, disagreement and useful
content angles across collected knowledge.

It answers:

```txt
Which claims are well-agreed, which claims are disputed, and how should downstream SEO consumers phrase or use them?
```

It does not answer:

```txt
How trustworthy is this source?
What topic should we write next?
What final article text should be published?
```

Source Trust owns trust scoring. Demand Engine owns keyword/page demand.
SEO Pack Generator and SEO Agent Gateway own final packaging and generation
interfaces.

## Core Principle

Consensus is not truth.

The first layer should detect repeated support, visible disagreement and SEO
usage guidance. It must not pretend to be a general reasoning engine.

Consensus decisions should preserve:

- canonical fact ids;
- subject entity ids;
- predicate ids;
- normalized attribute values;
- evidence chunk ids;
- source ids or domains;
- trust/evidence scores when available;
- uncertainty flags.

## Boundaries

SEO Consensus owns:

- fact grouping by entity, predicate and comparable attributes;
- consensus group contracts;
- conflict set contracts;
- support counts and source diversity;
- strongest-supported value selection;
- SEO phrasing hint contracts;
- content gap hint contracts;
- competitor pattern contracts for headings and FAQ-like questions.

SEO Consensus does not own:

- fact extraction;
- source trust scoring;
- external SEO provider metrics;
- SERP crawling;
- keyword discovery;
- content generation;
- final SEO Pack composition;
- full graph reasoning;
- manual editorial approval workflows.

## Consensus Detection

Consensus groups are built from canonical facts.

Initial grouping key:

```txt
subjectEntityId + predicateId + comparable normalized attribute key
```

Within a group, the system should calculate:

- fact count;
- supporting chunk count;
- supporting document count;
- supporting domain count;
- average source trust when available;
- average evidence strength when available;
- strongest supported value;
- weaker alternative values;
- confidence level;
- source/evidence references.

The strongest-supported value is a ranking decision for downstream consumers.
It is not an absolute truth claim.

## Conflict Detection

Conflict sets are created when facts share the same subject and predicate but
have incompatible comparable values.

Initial comparable value types:

- numeric values;
- numeric ranges;
- categorical values;
- boolean values;
- normalized string values.

The first implementation should support deterministic comparison helpers and
explicitly mark unsupported value shapes as `comparison_deferred` instead of
guessing.

Conflict records should include:

- competing value summaries;
- facts supporting each value;
- evidence counts per value;
- source diversity per value;
- trust/evidence score summaries when available;
- severity;
- suggested downstream handling.

## SEO Phrasing Hints

Phrasing hints are model-agnostic instructions for downstream consumers.

Initial hint types:

- `confident`: use when support and source diversity are strong;
- `cautious`: use when evidence is weak or source diversity is low;
- `comparison`: use when conflicting values are present;
- `avoid_claim`: use when a claim is unsupported or too risky;
- `needs_evidence`: use when a useful section lacks supporting facts.

Hints should be short, structured and non-vendor-specific. They should guide
future Knowledge Packs, SEO Packs and SEO Agent Gateway without generating
final text.

## Competitor Pattern Awareness

The consensus layer may surface recurring competitor content patterns using
already processed chunks and retrieval evidence.

Initial patterns:

- repeated headings;
- repeated section themes;
- repeated FAQ-like questions;
- comparison block opportunities;
- missing but useful sections.

This is not SERP Intelligence. It should not require live SERP snapshots or
keyword metrics. SERP Intelligence can later enrich these patterns with ranking
and feature data.

## Storage Model

Initial tables:

`consensus_groups`:

- group identity;
- subject entity id;
- predicate id;
- comparable key;
- strongest value summary;
- support counts;
- score summary;
- status;
- rule version.

`consensus_group_facts`:

- consensus group id;
- canonical fact id;
- value fingerprint;
- support role;
- score summary.

`conflict_sets`:

- subject entity id;
- predicate id;
- comparable key;
- competing value summaries;
- severity;
- suggested handling;
- status;
- rule version.

`conflict_set_facts`:

- conflict set id;
- canonical fact id;
- value fingerprint;
- side label;
- score summary.

`seo_phrasing_hints`:

- target type and target id;
- hint type;
- hint payload;
- evidence references;
- rule version.

`content_gap_hints`:

- topic/entity/predicate context;
- gap type;
- evidence reason;
- suggested section or FAQ angle;
- rule version.

The first runtime PR may implement only the minimum tables needed for fact
consensus and conflict detection. Competitor patterns may remain contract-only
until the required heading/FAQ inputs are stable.

## Service Boundaries

Recommended package:

```txt
packages/seo-consensus
```

Recommended services:

- `ConsensusGroupingService`: groups canonical facts into comparable sets.
- `ComparableValueService`: normalizes values for comparison.
- `ConflictDetectionService`: identifies competing values.
- `SeoPhrasingHintService`: creates structured phrasing guidance.
- `ContentGapHintService`: creates structured gap hints.
- `SeoConsensusRepository`: persists groups, conflicts and hints.

## Workflow

```txt
canonical facts + source trust scores
  -> normalize comparable values
  -> group facts by entity and predicate
  -> calculate consensus support
  -> detect conflicting values
  -> emit SEO phrasing hints
  -> emit content gap hints
  -> expose metadata to Knowledge Pack and future SEO Pack consumers
```

The workflow is eventually consistent. Knowledge Pack generation must remain
usable when consensus metadata is missing.

## Knowledge Pack Integration

Knowledge Packs should eventually include:

- consensus group references for facts;
- conflict set references for disputed facts;
- support counts;
- source diversity;
- SEO phrasing hints;
- content gap hints.

Before integration, Knowledge Pack must continue exposing unresolved conflict
flags from Source Trust as uncertainty, not as resolved consensus.

## MVP Scope

The first implementation should include:

- `packages/seo-consensus`;
- domain contracts for consensus groups, conflict sets and SEO hints;
- comparable value normalization helpers;
- deterministic consensus grouping;
- deterministic conflict detection for basic value types;
- repository abstraction;
- minimum persistence schema;
- tests for agreement, conflict and unsupported comparison scenarios;
- documentation and progress synchronization.

## Implementation Notes

The foundation package is `packages/seo-consensus`.

The initial implementation:

- normalizes primitive comparable values deterministically;
- marks unsupported comparison shapes as `comparison_deferred`;
- groups facts by subject entity, predicate and comparable key;
- ranks alternatives by support count, source diversity and optional
  trust/evidence scores;
- detects conflict sets when comparable values disagree;
- emits structured SEO phrasing hints and content gap hints;
- adds persistence contracts and minimum storage tables for consensus groups,
  conflict sets, SEO phrasing hints and content gap hints.

Knowledge Pack and SEO Pack consumption remain safe follow-ups. Until then,
downstream consumers continue using existing Knowledge Pack uncertainty fields.

The first Knowledge Pack integration:

- adds explicit consensus-to-fact mapping tables;
- writes consensus group and conflict set fact mappings from the
  `SeoConsensusRepository`;
- reads consensus metadata by canonical fact id in Knowledge Pack;
- exposes optional fact-level `consensus` metadata;
- keeps existing Knowledge Pack output valid when consensus records are absent.

The first implementation should not include:

- full graph reasoning;
- ML-based truth adjudication;
- live SERP analysis;
- keyword demand scoring;
- final article generation;
- editorial UI;
- broad competitor-pattern mining before inputs are stable.

## Definition Of Done

Issue #16 is complete when:

- canonical facts can be grouped into consensus groups;
- conflicting comparable values can be detected and preserved;
- unsupported comparison shapes are marked as deferred instead of guessed;
- SEO phrasing hint contracts exist;
- Knowledge Pack or future SEO Pack integration is documented or implemented
  safely;
- Source Trust scores remain inputs, not replacements for consensus;
- documentation, progress and project map are synchronized.
