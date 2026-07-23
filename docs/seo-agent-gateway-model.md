# SEO Agent Gateway Model

- Status: Design in review for Issue #42
- Issue: #42
- Date: 2026-07-23

## Purpose

SEO Agent Gateway is the model-agnostic boundary between SEO generation
requests and LLM consumers.

It answers:

```txt
What structured, research-grounded generation context must be prepared before
an LLM consumer is allowed to generate SEO output?
```

It does not answer:

```txt
What final article text should be written?
Which vendor prompt format should be used?
Should the generated content be published?
```

The gateway closes the gap between storing SEO knowledge and forcing generation
workflows to use that knowledge. For SEO generation workflows, the model does
not decide whether to use the knowledge base. The gateway enforces Focused
Research and structured pack usage first.

## Core Principle

The platform must not become a Codex-only plugin.

Codex is the first primary consumer, but SEO Agent Gateway output must remain
usable by Claude, Gemini, GPT, local LLMs and future custom agents.

The gateway produces structured generation context. It does not render a
vendor-specific prompt and does not call an LLM in the foundation boundary.

## Boundaries

SEO Agent Gateway owns:

- SEO generation request contracts;
- generation objective normalization;
- context requirement resolution;
- Focused Research requirement enforcement;
- required pack references;
- fallback/degraded context policy;
- structured generation context output;
- retrieval-only generation safeguards;
- consumer adapter contracts;
- source and uncertainty visibility;
- repository abstraction.

SEO Agent Gateway does not own:

- Topic configuration authoring;
- Focused Research scheduling internals;
- SERP collection;
- crawling;
- content processing;
- fact extraction;
- Knowledge Pack assembly;
- SERP Pack assembly;
- SERP Intent Pack assembly;
- SEO Pack assembly;
- prompt rendering;
- LLM provider calls;
- final content generation;
- publish approval;
- rank tracking;
- operator UI.

## Inputs

Initial request fields:

- topic id;
- query or long-tail keyword;
- generation objective;
- page type;
- language;
- geo;
- optional candidate key;
- optional target model family;
- optional consumer key;
- optional force research flag;
- optional source pack references.

Supported generation objectives:

- `page_generation`;
- `page_brief_generation`;
- `content_cluster_planning`;
- `faq_generation`;
- `comparison_page_generation`;
- `local_seo_page_generation`;
- `content_plan_generation`.

## Required Workflow

```txt
User SEO request
  -> SEO Agent Gateway
  -> context requirement resolution
  -> Focused Research request through Research Engine Scheduling
  -> Knowledge Platform update through downstream research subsystems
  -> Knowledge Pack + SERP Pack + SERP Intent Pack + SEO Pack
  -> model-agnostic generation context
  -> target LLM consumer
```

Focused Research may complete fully or return a degraded result. Degraded
research is acceptable only when the missing parts are visible in gateway
output.

## Required Packs

Gateway should prefer:

- SEO Pack;
- Knowledge Pack;
- SERP Pack;
- SERP Intent Pack;
- Research Scheduling dispatch/freshness summary;
- Context Pack when general retrieval context is needed;
- Candidate Scoring Pack when available.

SEO Pack is the primary SEO generation context. Context Pack is general
retrieval context and may supplement missing or broad context, but it should
not replace SEO Pack when SEO Pack is available.

## Structured Generation Context

Initial output should include:

- gateway request id or deterministic key;
- topic id;
- query;
- language;
- geo;
- generation objective;
- page type;
- focused research status;
- required pack references;
- research assets summary;
- entities;
- facts;
- core intents;
- opportunity intents;
- SERP patterns;
- SERP expectations;
- FAQ recommendations;
- required sources;
- generation constraints;
- uncertainty metadata;
- missing pack warnings;
- retrieval-only safeguard status;
- consumer hints;
- rule version.

This output is a structured data contract, not a prompt.

## Focused Research Enforcement

For SEO generation workflows, the gateway must create or require a Focused
Research step before returning generation context.

The gateway should:

- create a Focused Research request for the generation objective;
- pass topic id, query, language, geo, page type and candidate key when known;
- respect TTL-aware reuse decisions from Research Engine Scheduling;
- accept degraded research only when warnings and missing evidence are visible;
- avoid impossible completeness gates;
- never calculate fake coverage, readiness or completeness percentages.

## Retrieval-Only Safeguard

The gateway must prevent SEO generation from raw retrieval chunks alone when
structured packs exist or can be requested.

Allowed fallback:

- return best available structured context;
- mark missing SEO Pack, Knowledge Pack or SERP Pack explicitly;
- include Context Pack only as supplemental general retrieval context;
- set degraded state and generation constraints that warn consumers not to
  assert unsupported claims.

Disallowed fallback:

- silently pass raw chunks as the only SEO generation context;
- hide missing SERP or Knowledge evidence;
- let the LLM decide whether to use project knowledge;
- report fake readiness percentages.

## Consumer Adapters

Consumer adapters transform gateway output for downstream consumers.

Initial adapter contract should support:

- consumer key;
- supported objectives;
- supported context version;
- max context size hints;
- structured context transformation;
- warnings when the consumer cannot use required fields.

Consumer adapters may later include Codex, Claude, Gemini, GPT, local LLM and
future custom agent adapters.

Adapters must not own SEO research, pack assembly or final publish decisions.

## Fallback Behavior

If advanced packs are missing, gateway output should remain useful but honest.

Fallback states:

- `complete`: required packs are available and fresh enough;
- `degraded`: some packs or research assets are missing but structured context
  exists;
- `blocked`: generation should not proceed because required minimum context is
  absent or the Topic is archived/invalid.

The initial foundation should avoid hard-blocking except for invalid request or
explicitly blocked Topic state. Product or operator workflows may later choose
to enforce stricter gates.

## Storage Model

Initial tables may be added later:

`seo_agent_gateway_requests`:

- topic id;
- query;
- generation objective;
- page type;
- language;
- geo;
- consumer key;
- focused research job key;
- status;
- created timestamp.

`seo_agent_generation_contexts`:

- request id;
- source pack references;
- focused research status;
- structured context payload;
- missing pack warnings;
- degraded state;
- rule version;
- created timestamp.

The first runtime PR may start with package contracts and repository
abstraction if it preserves these accepted contracts.

## Service Boundaries

Recommended package:

```txt
packages/seo-agent-gateway
```

Recommended services:

- `SeoGenerationRequestService`: validates and normalizes generation requests.
- `ContextRequirementService`: resolves required packs and research needs.
- `FocusedResearchGateService`: creates or requires Focused Research through
  Research Engine Scheduling boundaries.
- `GatewayPackResolverService`: maps available pack-like inputs into gateway
  context.
- `RetrievalOnlySafeguardService`: prevents raw retrieval-only generation.
- `GenerationContextService`: assembles the model-agnostic generation context.
- `ConsumerAdapterRegistry`: exposes consumer adapter capabilities without
  vendor prompt rendering.
- `SeoAgentGatewayService`: orchestrates the gateway request lifecycle.
- `SeoAgentGatewayRepository`: persists request/context records when concrete
  persistence is introduced.

## Integration Points

Research Engine Scheduling:

- receives Focused Research requests;
- returns dispatch/freshness/degraded status.

SEO Pack Generator:

- provides primary SEO generation context.

Knowledge Pack, SERP Pack and SERP Intent Pack:

- provide structured knowledge and SERP evidence when SEO Pack is absent or
  incomplete.

Context Pack API:

- provides supplemental retrieval context;
- must not become the only SEO generation context when SEO Pack is available.

Consumer adapters:

- consume structured gateway context;
- may render prompts outside the core gateway package.

## MVP Scope

The first implementation should include:

- `packages/seo-agent-gateway`;
- generation request DTOs;
- generation objective DTOs;
- context requirement DTOs;
- Focused Research requirement DTOs;
- source pack reference DTOs;
- structured generation context DTOs;
- fallback state DTOs;
- consumer adapter contracts;
- retrieval-only safeguard service;
- deterministic gateway context assembly;
- repository abstraction;
- tests for Focused Research enforcement, fallback behavior and retrieval-only
  safeguards;
- documentation and progress synchronization.

The first implementation should not include:

- prompt rendering;
- LLM provider calls;
- final content generation;
- SEO Agent runtime execution;
- concrete database persistence;
- operator UI;
- publishing workflows;
- rank tracking.

## Definition Of Done

Issue #42 is complete when:

- SEO generation request contracts exist;
- generation objective normalization exists;
- Focused Research requirement is represented in gateway output;
- required pack references are represented;
- structured generation context output exists;
- fallback/degraded behavior is explicit;
- retrieval-only generation safeguards exist;
- consumer adapter contracts remain model-agnostic;
- gateway does not render vendor-specific prompts;
- gateway does not call LLM providers;
- documentation, progress and project map are synchronized.
