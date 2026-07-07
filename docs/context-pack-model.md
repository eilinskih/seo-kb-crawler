# Context Pack API Model

- Status: Proposed design for Issue #10 review
- Issue: #10
- Date: 2026-07-07

## Purpose

The Context Pack API is the primary model-agnostic integration point between
the Knowledge Platform and LLM consumers.

It converts retrieval results into structured context packages for generation,
planning, research and SEO work. Codex is the first consumer, but the output
must remain usable by Claude, Gemini, GPT, local LLMs and future custom agents.

The Context Pack API answers:

- What context should an LLM use for this topic, keyword or objective?
- Which sources support the context?
- Which evidence is weak, missing or contradictory?
- Which sections, FAQs, outline hints or gaps are useful downstream?

## Boundaries

Context Pack owns:

- Request DTOs for LLM-ready context.
- Lightweight query normalization.
- Retrieval orchestration.
- Deterministic packaging of retrieval results.
- Context profiles for different downstream tasks.
- Source references and ranking explanations in the output.
- Explicit uncertainty and missing-evidence reporting.

Context Pack does not own:

- Content generation.
- Search ranking internals.
- Entity/fact extraction.
- Knowledge Pack construction.
- SEO Pack generation.
- Vendor-specific prompt formatting.
- Public customer-facing API behavior.

## Flow

```txt
context pack request
  -> normalize query and hints
  -> select context profile
  -> call Hybrid Retrieval Engine
  -> group and diversify results
  -> package sources, sections, FAQs and gaps
  -> return model-agnostic context pack
```

The API consumes retrieval results. It must not mutate chunks, embeddings,
documents or topic configuration.

## Request Contract

Initial request:

```ts
interface ContextPackRequest {
  query: string;
  topicId?: string;
  language?: string;
  geo?: {
    countryCode?: string;
    regionCode?: string;
    city?: string;
  };
  vertical?: string;
  objective?: string;
  profile: ContextPackProfileName;
  limit?: number;
  includeDebug?: boolean;
  includeRawRetrieval?: boolean;
}
```

Query normalization should be lightweight:

- trim and normalize whitespace;
- keep original query;
- preserve language, geo and topic filters;
- derive retrieval hints only when deterministic;
- avoid adding a heavyweight query-understanding subsystem in the MVP.

## Context Profiles

Initial profiles:

- `article_generation`: context for writing SEO articles or landing pages.
- `research`: context for understanding a topic or competitor set.
- `outline`: context optimized for page planning and headings.
- `competitor_analysis`: context grouped around source/domain comparison.
- `raw_retrieval`: minimally packaged retrieval results for debugging.

Profiles configure:

- retrieval ranking profile;
- default result limit;
- grouping strategy;
- source diversity preference;
- whether to include FAQ candidates;
- whether to include outline hints;
- whether to include retrieval debug output.

## Retrieval Orchestration

The API should call the Hybrid Retrieval Engine with:

- normalized query;
- topic filter when provided;
- language filter when provided;
- geo filter when provided;
- profile-specific ranking profile;
- limit and debug flags.

The API should not bypass Retrieval Engine ranking or directly query database
tables in the MVP.

## Packaging Rules

Context Pack output should be deterministic for the same retrieval results.

Packaging should:

- group chunks by topic;
- group chunks by heading path;
- preserve source URL and canonical URL;
- preserve source domain;
- preserve language and geo hints;
- include ranking score breakdown when requested;
- remove redundant chunks;
- keep enough text for downstream synthesis;
- expose missing or weak evidence instead of hiding uncertainty.

## Output Contract

Initial response:

```ts
interface ContextPackResponse {
  normalizedQuery: string;
  profile: ContextPackProfileName;
  sections: ContextPackSection[];
  sources: ContextPackSource[];
  faqCandidates: ContextPackFaqCandidate[];
  outlineHints: ContextPackOutlineHint[];
  contentGaps: ContextPackGap[];
  retrieval: {
    degraded: boolean;
    warnings: string[];
    resultCount: number;
  };
  debug?: unknown;
}
```

Sections should contain grouped chunks, heading paths, source references,
language/geo metadata and optional score explanations.

Sources should be deduplicated by canonical URL when possible, with final URL
or requested URL as fallback.

## Uncertainty

The API must make uncertainty visible.

Examples:

- retrieval returned degraded keyword/metadata-only results;
- too few sources were found;
- all useful chunks came from one domain;
- no FAQ candidates were found;
- language or geo metadata is missing;
- source evidence is weak or duplicated.

Uncertainty should appear as warnings or content gaps, not as hidden behavior.

## Model-Agnostic Output

The Context Pack API should return structured JSON. It should not return a
single vendor-specific prompt.

Consumers may transform the pack into prompts for Codex, Claude, Gemini, GPT,
local LLMs or custom agents, but that formatting belongs outside the core
Context Pack contract.

## Issue #10 Implementation Scope

Issue #10 implementation may add:

- `packages/context-pack`;
- Context Pack DTOs;
- `ContextPackModule`;
- packaging service;
- profile definitions;
- API controller under `apps/api`;
- tests for deterministic packaging and profile behavior;
- API documentation.

Issue #10 implementation should not add:

- text generation;
- SEO Pack Generator;
- Knowledge Pack Builder;
- entity/fact extraction requirements;
- provider-specific prompt templates;
- public SaaS API features.

## Acceptance Criteria

- API accepts query/topic/language/geo/profile inputs.
- API calls the Hybrid Retrieval Engine rather than bypassing it.
- Output is deterministic for the same retrieval results.
- Output contains grouped sections, source references and retrieval metadata.
- Output can include ranking explanations when requested.
- Output exposes weak/missing evidence.
- Profiles are explicit and test-covered.
- The response remains model-agnostic JSON.
