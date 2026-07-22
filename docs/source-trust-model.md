# Source Trust And Evidence Scoring Model

- Status: Done
- Issue: #15
- Date: 2026-07-23

## Purpose

Source Trust and Evidence Scoring evaluates how reliable, well-supported and
traceable knowledge is.

It answers:

```txt
How much should downstream consumers trust this source, evidence set, fact or entity?
```

It does not answer:

```txt
Which conflicting answer is correct?
What should we write?
Which page should be generated?
```

Those questions belong to SEO Consensus, Demand Engine, SERP Intelligence and
SEO Pack generation.

## Core Principle

Confidence is not trust.

The system must keep these signals separate:

- extraction confidence: how confident the extractor was;
- normalization confidence: how confidently raw candidates matched accepted
  entities and predicates;
- source trust: how trustworthy the source appears to be;
- evidence strength: how well a fact is supported across chunks, documents and
  domains;
- final confidence: a derived convenience score, never a replacement for the
  separate signals.

Downstream packs should expose the component signals instead of hiding them
behind one opaque score.

## Boundaries

Source Trust and Evidence Scoring owns:

- source profile contracts;
- source type classification;
- configurable source trust rules;
- evidence aggregation across chunks, documents and domains;
- fact score calculation;
- entity score calculation;
- provenance-preserving score records;
- model-agnostic trust metadata for Knowledge Packs and future SEO Packs.

It does not own:

- crawling;
- content extraction;
- entity extraction;
- fact extraction;
- ontology approval;
- contradiction resolution;
- consensus decisions;
- ranking SEO opportunities;
- content generation;
- external authority-provider dependence.

## Source Types

Initial source type classifications:

- `official_documentation`;
- `government`;
- `manufacturer`;
- `vendor`;
- `news`;
- `wiki_reference`;
- `forum_community`;
- `user_generated`;
- `marketplace`;
- `affiliate`;
- `unknown`.

Classification should be deterministic and explainable. Initial signals may
include domain patterns, URL patterns, structured data, page metadata, known
project configuration and manually reviewed overrides.

The first implementation must work without external provider credentials.

## Score Model

Initial scores should use a normalized `0..1` scale.

### Source Trust

Source trust combines:

- source type base score;
- reviewed domain override when available;
- project or vertical-specific rule adjustment;
- metadata quality adjustment;
- crawl/content-processing warnings penalty;
- user-generated or affiliate-risk penalty when detected.

Source trust must preserve:

- source URL;
- canonical URL;
- domain;
- source type;
- score;
- rule version;
- explanation signals;
- review status.

### Evidence Strength

Evidence strength combines:

- supporting chunk count;
- supporting document count;
- supporting domain count;
- independent source diversity;
- average source trust;
- evidence recency when available;
- contradiction placeholder.

Evidence strength must not pretend to resolve contradictions before SEO
Consensus exists. If possible conflicts are visible but unresolved, the score
should expose `possible_conflict_unresolved`.

### Fact Score

Fact score combines:

- extraction confidence;
- normalization confidence when available;
- evidence strength;
- source trust;
- supporting source diversity;
- uncertainty flags.

Final fact confidence is a convenience value for sorting and thresholds. It
must not replace the component scores.

### Entity Score

Entity score combines:

- canonical entity confidence;
- approved alias confidence;
- mention count;
- supporting document count;
- supporting domain count;
- average source trust.

Entity scores should help downstream consumers prefer better-supported entity
mentions and aliases without turning the Entity Layer into a full Knowledge
Graph.

## Storage Model

Initial tables:

`source_profiles`:

- source identity by canonical URL/domain;
- source type;
- reviewed override status;
- rule version;
- score components;
- final source trust score.

`source_trust_scores`:

- historical source trust calculations;
- input signals;
- score components;
- rule version;
- created timestamp.

`evidence_links`:

- fact/entity to chunk links;
- chunk to document/document version links;
- source references;
- evidence role;
- confidence/provenance metadata.

`fact_scores`:

- canonical fact id;
- evidence strength;
- source trust aggregate;
- extraction confidence;
- normalization confidence;
- final confidence;
- uncertainty flags.

`entity_scores`:

- entity id;
- alias/mention support;
- source diversity;
- average source trust;
- final entity confidence.

The first runtime PR may create the minimum schema needed for deterministic
source and fact scoring. It should not store future-only fields unless they are
part of accepted contracts.

## Service Boundaries

Recommended package:

```txt
packages/source-trust
```

Recommended services:

- `SourceClassifier`: classifies source type from deterministic signals.
- `SourceTrustService`: calculates and stores source trust scores.
- `EvidenceAggregationService`: aggregates chunk/document/domain support.
- `FactScoringService`: calculates fact score components.
- `EntityScoringService`: calculates entity score components.
- `TrustScoringRepository`: reads inputs and persists score records.

The package should be imported by Knowledge Pack only after score records can
be consumed safely without changing existing Knowledge Pack behavior by
default.

## Workflow

```txt
canonical facts/entities available
  -> classify source profiles
  -> calculate source trust scores
  -> aggregate evidence links
  -> calculate fact scores
  -> calculate entity scores
  -> expose trust metadata to Knowledge Pack and future SEO Pack consumers
```

The workflow is eventually consistent. Retrieval and Context Pack generation
must remain usable when trust scores are missing.

## Knowledge Pack Integration

Knowledge Packs should eventually include:

- source trust score per source when available;
- evidence strength per fact when available;
- score components, not only final score;
- uncertainty flags;
- threshold metadata for profiles.

Before integration, Knowledge Pack must continue exposing unknown trust rather
than fabricating scores.

## MVP Scope

The first implementation should include:

- `packages/source-trust`;
- domain contracts and scoring component DTOs;
- source classification contracts;
- deterministic default scoring rules;
- repository abstraction;
- persistence migration for accepted minimum tables;
- source trust calculation tests;
- evidence aggregation tests;
- fact score calculation tests;
- documentation and progress synchronization.

## Implementation Notes

The foundation package is `packages/source-trust`.

The initial implementation:

- classifies sources using deterministic local rules;
- calculates source trust without external provider credentials;
- aggregates evidence strength across chunks, documents and domains;
- calculates fact confidence while preserving extraction, normalization,
  evidence and source trust components;
- calculates entity confidence from entity, alias, mention and source-diversity
  signals;
- adds persistence contracts and minimum accepted storage tables for source
  profiles, source trust scores, evidence links, fact scores and entity scores.

Knowledge Pack integration remains safe-by-default. Score production and score
consumption can be introduced independently; consumers must continue to handle
missing trust scores as unknown trust.

The first Knowledge Pack integration:

- reads `source_profiles`, `fact_scores` and `entity_scores` when available;
- exposes optional `trust` metadata on sources, facts and entities;
- keeps existing output valid when trust score records are absent;
- surfaces `possible_conflict_unresolved` as an evidence gap when fact score
  uncertainty flags include it;
- does not resolve conflicts or replace component scores with one opaque value.

The first implementation should not include:

- external authority providers;
- contradiction resolution;
- SEO Consensus;
- PageRank-like graph scoring;
- machine-learned trust models;
- manual review UI;
- content generation changes.

## Definition Of Done

Issue #15 is complete when:

- source trust and evidence scoring contracts are implemented;
- source trust and evidence strength remain separate from extraction
  confidence;
- deterministic scoring works without external provider credentials;
- source, fact and entity score records are persisted or explicitly deferred by
  accepted design;
- Knowledge Pack integration is documented or implemented safely;
- unresolved conflict semantics remain reserved for SEO Consensus;
- documentation, progress and project map are synchronized.
