# SEO Pack Generator Model

- Status: Foundation complete for Issue #21
- Issue: #21
- Date: 2026-07-23

## Purpose

SEO Pack Generator assembles the final model-agnostic SEO context package used
by SEO Agent Gateway and future LLM consumers.

It answers:

```txt
What structured SEO context is needed before a writing agent can produce or
revise this page responsibly?
```

It does not answer:

```txt
What final text should be published?
Which model should write the page?
Should this page be published automatically?
```

SEO Pack Generator is the packaging layer between research intelligence and
generation consumers. It combines what the system knows, how SERPs present the
topic, which intents matter and why a candidate page is worth pursuing.

Context Pack provides general retrieval context. SEO Pack is the higher-level
SEO planning package built from Knowledge, Demand, SERP, Intent and Scoring
packs.

## Core Principle

SEO Packs must be structured and model-agnostic.

An SEO Pack is not a Codex-only prompt, not a generated article and not a raw
retrieval dump. It should be safe for Codex, Claude, Gemini, GPT, local models,
operator UI previews and future internal agents to consume.

Content generation must not rely on retrieval chunks alone when SEO Pack data
is available.

## Boundaries

SEO Pack Generator owns:

- SEO Pack request and response contracts;
- page brief assembly;
- recommended outline assembly;
- FAQ recommendations;
- required entity and fact references;
- mandatory and opportunity intent packaging;
- SERP expectation packaging;
- competitor insight packaging;
- internal linking hint packaging;
- geo and language recommendations;
- source, confidence and uncertainty metadata;
- degraded/fallback pack behavior;
- repository abstraction.

SEO Pack Generator does not own:

- keyword discovery;
- demand provider integrations;
- SERP collection;
- SERP intent classification;
- crawling;
- content extraction;
- fact extraction;
- candidate scoring;
- final content generation;
- prompt rendering;
- publish approval;
- rank tracking;
- operator UI.

## Inputs

Initial inputs:

- Knowledge Pack from `packages/knowledge-pack`;
- Demand Pack from Demand Engine;
- SERP Pack from SERP Intelligence;
- SERP Intent Pack from SERP Intent Analyzer;
- Candidate Scoring Pack from SEO Page Candidate Scoring;
- Topic Expansion Pack when available;
- Long-tail Discovery Pack when available;
- Research Assets metadata when available;
- topic id, candidate key, language and geo;
- optional page type profile;
- optional future provider metrics from External SEO Data Providers (#40).

Missing optional packs should lower confidence and add warnings. Missing paid
provider metrics must never block SEO Pack assembly.

## Outputs

Initial SEO Pack output should include:

- pack id or deterministic pack key;
- topic id;
- candidate key;
- page type;
- language and geo;
- page brief;
- recommended outline;
- FAQ recommendations;
- required entities;
- required facts;
- mandatory SERP intents;
- opportunity intents;
- SERP expectations;
- competitor insights;
- internal linking hints;
- geo and language recommendations;
- source references;
- uncertainty and evidence gap metadata;
- generation constraints;
- warnings;
- degraded/fallback state;
- source pack references;
- rule version.

The output should remain deterministic for the same input packs and profile.

## Page Brief

The page brief should summarize the candidate opportunity without writing the
page.

Initial fields:

- title concept;
- target audience;
- primary intent;
- secondary intents;
- candidate rationale from scoring;
- demand summary;
- SERP summary;
- knowledge summary;
- evidence gaps;
- explicit non-goals or exclusions when known.

The brief should expose weak evidence instead of hiding it behind confident
copy.

## Recommended Outline

Recommended outline sections should be derived from SERP expectations,
mandatory intents, opportunity intents, Knowledge Pack facts and scored
candidate rationale.

Each outline section should preserve:

- section heading suggestion;
- section purpose;
- mapped intent ids;
- required entity ids;
- required fact ids;
- supporting source references;
- confidence;
- warnings.

Outline sections are planning hints. They are not final copy and should not
contain generated prose.

## FAQ Recommendations

FAQ recommendations should combine:

- People Also Ask and FAQ patterns from SERP Pack;
- SERP Intent Pack questions or opportunity intents;
- Knowledge Pack facts and gaps;
- long-tail question candidates when available.

Each FAQ item should preserve:

- question;
- intent classification;
- required fact ids;
- supporting sources;
- confidence;
- unresolved evidence gaps.

## Required Entities And Facts

SEO Pack should explicitly separate:

- entities required to cover the topic;
- facts that may be stated with source support;
- facts with unresolved conflict;
- facts that require more research;
- entity or fact gaps that should not be fabricated.

Knowledge Pack remains the source of known entities and facts. SEO Pack can
organize them for writing but must not promote unsupported facts to canonical
truth.

## SERP Requirements

SERP requirements should include:

- mandatory intents;
- opportunity intents;
- content depth expectations;
- recurring heading themes;
- FAQ expectations;
- competitor angle summaries;
- missing opportunity signals;
- SERP feature hints when available.

Degraded or fallback SERP Packs should remain visible. SEO Pack should not turn
fallback SERP evidence into hard content requirements.

## Internal Linking Hints

Initial internal linking hints may be sparse until a richer site graph exists.

The contract should support:

- source page candidates;
- target page candidates;
- anchor concept suggestions;
- related entity ids;
- related topic ids;
- confidence;
- reason.

SEO Pack Generator may package hints from upstream signals, but it should not
own site crawl scheduling or internal link graph maintenance.

## Profiles

Initial page type profiles:

- `landing_page`;
- `guide`;
- `faq_page`;
- `comparison_page`;
- `local_page`;
- `entity_page`;
- `supporting_page`;
- `update_existing`.

Profiles may influence outline expectations, FAQ emphasis, entity coverage and
generation constraints. Profiles must not hide uncertainty or fabricate missing
evidence.

## Generation Constraints

Generation constraints are model-agnostic instructions for downstream agents.

Initial constraint types:

- facts that must be cited;
- facts that must not be asserted because evidence is weak;
- required intents;
- optional opportunity intents;
- prohibited unsupported claims;
- unresolved conflicts requiring Product Owner or SEO review;
- language and geo constraints;
- required source references.

These constraints are not vendor-specific prompt text.

## Storage Model

Initial tables may be added later:

`seo_pack_runs`:

- topic id;
- candidate key;
- page type profile;
- source pack references;
- degraded state and warnings;
- rule version;
- created timestamp.

`seo_packs`:

- run id;
- deterministic pack key;
- page brief payload;
- outline payload;
- FAQ payload;
- required entity payload;
- required fact payload;
- SERP requirement payload;
- competitor insight payload;
- linking hint payload;
- uncertainty payload.

The first runtime PR may start with package contracts and repository
abstraction if it preserves these accepted contracts.

## Service Boundaries

Recommended package:

```txt
packages/seo-pack
```

Implemented foundation package:

- `packages/seo-pack/src/domain/seo-pack-types.ts` defines SEO Pack requests,
  source pack references, page briefs, outline sections, FAQ recommendations,
  required evidence, SERP requirements, internal linking hints, generation
  constraints and final SEO Pack output.
- `packages/seo-pack/src/seo-pack.service.ts` assembles deterministic
  model-agnostic SEO Packs from upstream pack-like inputs.
- `packages/seo-pack/src/page-brief.service.ts`,
  `recommended-outline.service.ts`, `faq-recommendation.service.ts`,
  `required-evidence.service.ts`, `serp-requirement.service.ts`,
  `internal-linking-hint.service.ts` and `generation-constraint.service.ts`
  own focused assembly slices.
- `packages/seo-pack/src/persistence/seo-pack.repository.ts` defines the
  repository abstraction; concrete database persistence remains deferred.

Recommended services:

- `SeoPackInputService`: validates and normalizes source pack inputs.
- `PageBriefService`: assembles the page brief.
- `RecommendedOutlineService`: builds deterministic outline section hints.
- `FaqRecommendationService`: assembles FAQ recommendations.
- `RequiredEvidenceService`: maps required entities, facts and source
  references.
- `SerpRequirementService`: packages SERP expectations and intents.
- `InternalLinkingHintService`: packages internal linking hints when available.
- `GenerationConstraintService`: creates model-agnostic generation constraints.
- `SeoPackService`: assembles the final SEO Pack.
- `SeoPackRepository`: persists pack runs and latest packs when concrete
  persistence is introduced.

## Workflow

```txt
Knowledge Pack + Demand Pack + SERP Pack + SERP Intent Pack
  + Candidate Scoring Pack
  + optional Topic Expansion Pack / Long-tail Discovery Pack / Research Assets
  -> input normalization
  -> page brief assembly
  -> outline + FAQ planning
  -> required entity/fact mapping
  -> SERP requirement packaging
  -> internal linking hints
  -> generation constraints
  -> SEO Pack
  -> SEO Agent Gateway
  -> SEO Agent Gateway consumer adapters
```

If some upstream packs are missing, the workflow should still return a
degraded SEO Pack when enough context exists to be useful. The degraded state
and missing evidence must be visible to downstream consumers.

## MVP Scope

The first implementation should include:

- `packages/seo-pack`;
- SEO Pack request and response DTOs;
- page brief DTOs;
- recommended outline DTOs;
- FAQ recommendation DTOs;
- required entity and fact DTOs;
- SERP requirement DTOs;
- internal linking hint DTOs;
- generation constraint DTOs;
- deterministic assembly service;
- page type profile support;
- degraded/fallback behavior;
- repository abstraction;
- tests using Knowledge/Demand/SERP/Intent/Scoring-like fixtures;
- documentation and progress synchronization.

The first implementation should not include:

- content generation;
- prompt rendering;
- SEO Agent Gateway runtime;
- operator UI;
- concrete database persistence;
- scheduling;
- paid provider integrations;
- automatic publish decisions;
- rank tracking.

## Definition Of Done

Issue #21 is complete when:

- SEO Pack contracts exist. Done.
- page brief assembly exists. Done.
- recommended outline assembly exists. Done.
- FAQ recommendation assembly exists. Done.
- required entity and fact mapping exists. Done.
- SERP intent and expectation packaging exists. Done.
- internal linking hint contract exists. Done.
- generation constraints remain model-agnostic. Done.
- missing optional packs and paid metrics do not block degraded pack assembly.
  Done.
- SEO Pack output does not contain final generated article text. Done.
- SEO Agent Gateway dependency boundary is documented. Done.
- documentation, progress and project map are synchronized. Done.
