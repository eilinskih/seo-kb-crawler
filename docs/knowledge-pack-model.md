# Knowledge Pack Builder Model

- Status: Design proposed for Issue #14
- Issue: #14
- Date: 2026-07-23

## Purpose

The Knowledge Pack Builder assembles model-agnostic knowledge packages for LLM
consumers.

It turns retrieval results, canonical entities, aliases, ontology metadata and
canonical facts into structured knowledge. Facts become first-class knowledge
objects. Chunks remain supporting evidence and source material.

Knowledge Pack answers:

```txt
What do we know, why do we believe it, and where did it come from?
```

It does not answer:

```txt
What should we write?
How should SERP intent be interpreted?
Which candidate page should rank highest?
```

Those questions belong to Demand Engine, SERP Intelligence, Topic Expansion,
SEO Page Candidate Scoring and SEO Pack generation.

## Boundaries

Knowledge Pack Builder owns:

- model-agnostic Knowledge Pack DTOs;
- profile-specific knowledge assembly;
- canonical fact prioritization;
- entity and alias packaging;
- ontology reference packaging;
- evidence chunk linking;
- source references;
- evidence gaps and uncertainty metadata.

Knowledge Pack Builder does not own:

- retrieval ranking;
- entity extraction;
- fact extraction;
- predicate approval;
- source trust scoring;
- SEO consensus;
- SERP analysis;
- Demand Engine candidate generation;
- SEO Pack generation;
- content generation;
- vendor-specific prompt formatting.

## Dependencies

Required foundations:

- Hybrid Retrieval Engine (#9);
- Context Pack API foundation (#10) as the current LLM-facing integration
  pattern;
- Entity and Alias Layer (#11);
- Ontology and Predicate Registry (#12);
- Fact Extraction Worker (#13).

Future enrichment:

- Source Trust and Evidence Scoring (#15);
- SEO Consensus and Conflict Layer (#16);
- SERP Intelligence (#18);
- SEO Pack Generator (#21);
- SEO Agent Gateway (#42).

The first implementation must work before #15 and #16 exist. It should expose
unknown trust and unresolved conflict state instead of fabricating scores.

## Flow

```txt
knowledge pack request
  -> select profile
  -> call Retrieval when query context is needed
  -> collect canonical entities and aliases
  -> collect canonical facts
  -> link facts to evidence chunks and source documents
  -> attach ontology references
  -> expose evidence gaps and uncertainty
  -> return model-agnostic Knowledge Pack
```

Knowledge Pack may consume retrieval results from Context Pack or directly from
Hybrid Retrieval, but it must not bypass existing retrieval ranking rules.

## Profiles

Initial profiles:

- `article_generation`;
- `competitor_research`;
- `content_planning`;
- `entity_research`;
- `fact_verification`;

Profile behavior:

- `article_generation` should prioritize high-confidence facts and concise
  evidence.
- `competitor_research` should preserve source/domain diversity.
- `content_planning` should surface evidence gaps and missing angles.
- `entity_research` should focus on entities, aliases and ontology references.
- `fact_verification` should preserve provenance and uncertainty over brevity.

## Request Contract

Initial request:

```ts
interface KnowledgePackRequest {
  query: string;
  topicId?: string;
  language?: string;
  geo?: {
    countryCode?: string;
    regionCode?: string;
    city?: string;
  };
  vertical?: string;
  profile: KnowledgePackProfileName;
  limit?: number;
  includeDebug?: boolean;
  includeRawRetrieval?: boolean;
}
```

Requests should remain model-agnostic and should not include vendor prompt
instructions.

## Output Contract

Initial response:

```ts
interface KnowledgePackResponse {
  normalizedQuery: string;
  profile: KnowledgePackProfileName;
  entities: KnowledgePackEntity[];
  aliases: KnowledgePackAlias[];
  facts: KnowledgePackFact[];
  evidenceChunks: KnowledgePackEvidenceChunk[];
  sources: KnowledgePackSource[];
  ontologyReferences: KnowledgePackOntologyReference[];
  evidenceGaps: KnowledgePackEvidenceGap[];
  confidence: KnowledgePackConfidence;
  retrieval: {
    degraded: boolean;
    warnings: string[];
    resultCount: number;
  };
  debug?: unknown;
}
```

Facts must preserve:

- canonical fact id;
- subject entity id;
- object entity id or normalized object value;
- predicate id and predicate key when available;
- normalized attributes;
- confidence;
- provenance;
- supporting chunk ids;
- source ids.

Evidence chunks must preserve:

- chunk id;
- document id;
- document version id;
- source URL;
- heading path;
- chunk type;
- language and geo hints;
- text snippet.

## Assembly Rules

Knowledge assembly should:

- prioritize canonical facts over raw retrieval text;
- group facts by subject entity and predicate;
- attach supporting chunks when source chunk ids are available;
- preserve source documents for traceability;
- include aliases relevant to requested language when available;
- include ontology predicate/entity-type references when available;
- avoid duplicating identical fact/evidence combinations;
- keep retrieval chunks that add useful context even when no fact exists.

Raw facts are not canonical knowledge. They may appear only in debug or future
review workflows, never as accepted Knowledge Pack facts.

## Confidence And Gaps

Before Source Trust and SEO Consensus exist, confidence metadata must be modest.

Initial confidence should use:

- fact confidence;
- predicate resolution status;
- number of supporting chunks;
- source diversity when available;
- retrieval degraded state.

Initial evidence gaps:

- `no_canonical_facts`;
- `weak_fact_support`;
- `single_source_support`;
- `missing_entity_aliases`;
- `missing_ontology_reference`;
- `retrieval_degraded`;
- `possible_conflict_unresolved`.

Do not produce fake completeness percentages.

## Context Pack Integration

Context Pack remains the current LLM-facing retrieval package.

Knowledge Pack should integrate in one of two safe ways:

- Context Pack may include a Knowledge Pack block when requested and available.
- SEO Agent Gateway or future consumers may request Knowledge Pack directly.

Context Pack must remain usable without Knowledge Pack data. Knowledge Pack
must remain model-agnostic and must not emit vendor-specific prompts.

## MVP Scope

The first implementation should include:

- `packages/knowledge-pack`;
- profile definitions;
- request/response DTOs;
- deterministic assembly service;
- repository abstraction for entities, aliases, canonical facts, chunks and
  sources;
- degraded behavior when no facts exist;
- evidence gap generation;
- tests for deterministic pack generation, fact prioritization and missing
  evidence handling;
- optional Context Pack API integration when it can be done without changing
  Context Pack behavior by default.

The first implementation should not include:

- source trust scoring;
- conflict resolution;
- SEO Pack generation;
- SERP Pack generation;
- content generation;
- provider-specific prompt templates;
- artificial completeness percentages.

## Definition Of Done

Issue #14 is complete when:

- Knowledge Pack DTOs and profiles are implemented;
- canonical facts are first-class pack objects;
- evidence chunks and sources are linked to facts;
- entities, aliases and ontology references are included when available;
- missing or weak evidence is surfaced explicitly;
- output is deterministic and model-agnostic;
- Context Pack integration is documented or implemented safely;
- documentation, progress and project map are synchronized.
