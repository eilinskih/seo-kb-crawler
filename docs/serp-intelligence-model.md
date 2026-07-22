# SERP Intelligence Model

- Status: Foundation complete for Issue #18
- Issue: #18
- Date: 2026-07-23

## Purpose

SERP Intelligence learns how search results present a query, topic or candidate
page opportunity.

It answers:

```txt
How do top-ranking pages structure, frame and support this search intent?
```

It does not answer:

```txt
What keyword opportunities should we create?
Which fact is true?
What final content should be generated?
```

Demand Engine owns candidate keywords and candidate pages. Knowledge Pack owns
what is known. SEO Consensus owns agreement and conflict metadata. SEO Pack
Generator owns final generation-ready packaging.

## Core Principle

SERP Intelligence is not rank tracking.

The goal is to understand search intent patterns, expected sections, content
angles, recurring entities and competitor structures. Historical ranking data
may be stored, but the first implementation should not become a position
monitoring product.

## Boundaries

SERP Intelligence owns:

- SERP snapshot contracts;
- ranking result page references;
- heading pattern analysis;
- FAQ pattern analysis;
- recurring entity pattern analysis;
- content depth hints;
- content angle detection;
- SERP expectation DTOs;
- SERP Pack DTOs;
- model-agnostic output for future SEO Pack and Agent Gateway consumers.

SERP Intelligence does not own:

- keyword discovery;
- demand metrics;
- crawling implementation;
- content extraction implementation;
- fact extraction;
- consensus decisions;
- final SEO Pack generation;
- rank tracking alerts.

## Inputs

Initial inputs:

- keyword or long-tail query;
- topic id when available;
- language;
- geo;
- candidate page id when available;
- SERP result URLs and positions;
- processed competitor document versions;
- chunks/headings/FAQ-like sections from Content Processing and Chunking;
- entity and fact signals when available;
- demand candidate metadata when available.

SERP collection may later be triggered by Research Engine Scheduling (#43),
Focused Research or manual operator requests.

## SERP Snapshot

SERP snapshots preserve observed search result state.

Initial fields:

- query;
- normalized query;
- topic id;
- language;
- geo;
- snapshot timestamp;
- provider key;
- provider mode;
- degraded/fallback flags;
- result count;
- result URLs;
- result positions;
- result titles/snippets when available;
- linked document ids when crawled and processed.

Snapshots should be append-only where practical. Current consumers can use the
latest usable snapshot, while future analysis may compare historical changes.

## Heading Pattern Analysis

Heading analysis should identify:

- recurring H1/H2/H3 text patterns;
- normalized heading clusters;
- heading frequency across result pages;
- common ordering patterns;
- missing headings versus target content when target content exists.

It should not copy competitor outlines verbatim. It should surface reusable
expectations, such as "pricing section appears on most ranking pages".

## FAQ Pattern Analysis

FAQ analysis should identify:

- common questions;
- semantically similar question groups;
- source pages supporting each question;
- frequency and source diversity;
- candidate FAQ questions for SERP Pack consumers.

The first implementation can use deterministic normalization and exact/near
text grouping. Semantic grouping can follow after the foundation contracts are
stable.

## Entity Pattern Analysis

Entity pattern analysis should identify:

- entities recurring across ranking pages;
- entity types most associated with the SERP;
- missing entities versus target content when target content exists;
- supporting entities and related topics.

Entity patterns should consume existing Entity/Alias outputs when available,
not invent a separate entity system.

## Content Depth Analysis

Content depth analysis should estimate:

- word/token count ranges;
- section count ranges;
- heading depth;
- FAQ count;
- table/list/comparison usage;
- shallow competitor opportunities.

Do not report global topic coverage percentages. Depth hints are SERP
expectations, not proof that content is complete.

## Content Angle Detection

Initial content angles:

- `informational`;
- `commercial`;
- `local`;
- `guide`;
- `review`;
- `comparison`;
- `tutorial`;
- `navigational`;
- `mixed`;
- `unknown`.

Angle detection should use observable SERP/page patterns such as titles,
headings, URL paths, snippets and recurring section types. SERP Intent Analyzer
(#30) can later turn these patterns into mandatory/optional intent semantics.

## SERP Expectations

SERP Expectations are structured findings for downstream packs.

Initial expectations:

- expected sections;
- expected FAQ patterns;
- expected entities;
- expected proof points;
- expected comparison/table/list structures;
- content depth hints;
- dominant and secondary content angles;
- missing opportunities.

Expectations must preserve supporting result references and frequency/source
diversity signals.

## SERP Pack

SERP Pack is the model-agnostic output of this layer.

Initial pack fields:

- normalized query;
- topic id;
- language and geo;
- snapshot references;
- recurring headings;
- recurring FAQ candidates;
- recurring entities;
- dominant content angle;
- depth hints;
- SERP expectations;
- competitor depth summary;
- missing opportunities;
- degraded/fallback flags.

SERP Pack should complement Knowledge Pack. Knowledge Pack says what the system
knows; SERP Pack says how ranking pages tend to present the topic.

## Storage Model

Initial tables:

`serp_snapshots`:

- query, normalized query, topic/language/geo;
- provider and fallback mode;
- captured timestamp;
- degraded state and warnings.

`serp_results`:

- snapshot id;
- position;
- URL/canonical URL/domain;
- title/snippet when available;
- linked document/document version ids when available.

`serp_heading_patterns`:

- snapshot id or normalized query context;
- normalized heading;
- heading level;
- frequency;
- source diversity;
- supporting result ids.

`serp_faq_patterns`:

- normalized question;
- frequency;
- source diversity;
- supporting result ids.

`serp_entity_patterns`:

- entity id/type when available;
- frequency;
- source diversity;
- supporting result ids.

`serp_packs`:

- query context;
- expectation payload;
- degraded/fallback state;
- rule version.

The first runtime PR may implement a smaller schema if it still preserves the
accepted contracts and avoids blocking later SERP Pack generation.

## Service Boundaries

Recommended package:

```txt
packages/serp-intelligence
```

Implemented foundation package:

- `packages/serp-intelligence/src/domain/serp-intelligence-types.ts`
  defines SERP snapshots, result references, page evidence, pattern summaries,
  depth summaries, angle summaries and SERP Pack contracts.
- `packages/serp-intelligence/src/serp-pack.service.ts` assembles deterministic
  SERP Packs from an imported snapshot and processed competitor-page evidence.
- `packages/serp-intelligence/src/*-pattern.service.ts` provides deterministic
  heading, FAQ and entity pattern analysis.
- `packages/serp-intelligence/src/content-depth.service.ts` and
  `packages/serp-intelligence/src/content-angle.service.ts` provide the first
  depth and angle heuristics.
- `packages/serp-intelligence/src/persistence/serp-intelligence.repository.ts`
  defines the repository abstraction; concrete database persistence remains
  deferred.
- `packages/serp-intelligence/src/testing/in-memory-serp-intelligence.repository.ts`
  provides deterministic test storage for repository contract consumers.

Recommended services:

- `SerpSnapshotService`: records or imports SERP snapshots.
- `HeadingPatternService`: analyzes recurring headings.
- `FaqPatternService`: analyzes recurring questions.
- `EntityPatternService`: analyzes recurring entity mentions.
- `ContentDepthService`: summarizes content depth expectations.
- `ContentAngleService`: detects presentation angle.
- `SerpPackService`: assembles model-agnostic SERP Packs.
- `SerpIntelligenceRepository`: persists snapshots, patterns and packs.

## Workflow

```txt
candidate query or manual query
  -> SERP snapshot collection/import
  -> competitor result crawl/process/chunk
  -> heading/FAQ/entity/depth/angle analysis
  -> SERP expectations
  -> SERP Pack
  -> future SERP Intent Pack / SEO Pack
```

The workflow is eventually consistent. Content generation must remain usable
when SERP Intelligence is missing, but SEO Pack generation should prefer SERP
Pack data when available.

## MVP Scope

The first implementation should include:

- `packages/serp-intelligence`;
- SERP snapshot and result contracts;
- SERP Pack DTOs;
- deterministic heading pattern analysis;
- deterministic FAQ pattern analysis;
- deterministic content depth summary;
- deterministic content angle heuristic;
- repository abstraction;
- tests using competitor page fixtures;
- documentation and progress synchronization.

The first implementation should not include:

- concrete database persistence;
- live paid SERP provider integrations;
- rank tracking alerts;
- SERP Intent Analyzer runtime;
- SEO Pack Generator runtime;
- semantic FAQ clustering;
- full competitor crawl orchestration;
- editorial UI.

## Definition Of Done

Issue #18 is complete when:

- SERP snapshot and result contracts exist. Done.
- heading, FAQ, depth and angle analysis foundations are implemented. Done.
- SERP Pack DTOs are implemented. Done.
- degraded/fallback SERP state is explicit. Done.
- Knowledge Pack, Demand Engine and SEO Consensus boundaries remain separate.
  Done.
- documentation, progress and project map are synchronized. Done.
