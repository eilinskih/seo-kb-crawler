# Entity and Alias Layer Model

- Status: Proposed design for Issue #11 review
- Issue: #11
- Date: 2026-07-07

## Purpose

The Entity and Alias Layer is a lightweight normalization layer for names,
spellings, abbreviations, translations and multilingual variants.

It improves retrieval and context quality by resolving different surface forms
to canonical entities when the repository has enough evidence.

It is not a full Knowledge Graph. It does not own ontology rules, fact
extraction, predicate modeling, trust scoring or external enrichment.

## Problem

SEO projects often use several names for the same thing:

- `BMW N47`, `N47`, `N47D20`, `BMW N47 engine`;
- `Frogger Jump`, `Фроггер Джамп`, `Frogger-Spiel`;
- `800+`, `Rodzina 800+`, `świadczenie 800+`;
- `PostgreSQL`, `Postgres`, `pgvector extension`.

Without alias normalization, retrieval can miss relevant chunks and Context
Packs can present fragmented knowledge to downstream LLM consumers.

## Boundaries

Entity and Alias Layer owns:

- canonical entity records;
- aliases and alias metadata;
- entity mentions found in chunks;
- manual alias creation contract;
- future alias suggestion contract;
- query expansion contract for retrieval;
- entity metadata contract for Context Packs and future Knowledge Packs.

Entity and Alias Layer does not own:

- full Knowledge Graph traversal;
- ontology and predicate registry;
- fact extraction;
- source trust scoring;
- SEO consensus;
- external provider enrichment;
- content generation.

Retrieval and Context Pack must continue to work when no entity data exists.

## Flow

```txt
manual aliases or future extraction suggestions
  -> canonical entity records
  -> aliases with language, geo, type and review status
  -> entity mentions attached to chunks
  -> retrieval query expansion and match boosts
  -> Context Pack entity metadata
  -> future Knowledge Pack inputs
```

## Core Concepts

### Canonical Entity

A canonical entity represents the normalized identity.

Initial fields:

- `id`;
- `canonicalName`;
- `entityType`;
- `vertical`;
- `description`;
- `confidence`;
- `source`;
- `reviewStatus`;
- `createdAt`;
- `updatedAt`.

`entityType` should be universal by default, with optional vertical-specific
types later. Examples:

- `brand`;
- `product`;
- `model`;
- `procedure`;
- `place`;
- `organization`;
- `person`;
- `law`;
- `software`;
- `technology`;
- `concept`;
- `unknown`.

### Alias

An alias is a surface form that can resolve to a canonical entity.

Initial fields:

- `id`;
- `entityId`;
- `aliasText`;
- `normalizedAliasText`;
- `language`;
- `geo`;
- `aliasType`;
- `confidence`;
- `reviewStatus`;
- `source`;
- `createdAt`;
- `updatedAt`.

Initial alias types:

- `exact`;
- `abbreviation`;
- `translation`;
- `transliteration`;
- `spelling_variant`;
- `brand_model_variant`;
- `other`.

### Entity Mention

An entity mention records evidence that a chunk contains a canonical entity or
alias.

Initial fields:

- `id`;
- `entityId`;
- `aliasId`;
- `chunkId`;
- `mentionText`;
- `startOffset`;
- `endOffset`;
- `locationHint`;
- `language`;
- `geo`;
- `confidence`;
- `source`;
- `createdAt`.

Offsets should be stored when available. When exact offsets are not available,
`locationHint` can preserve approximate evidence such as heading path, paragraph
index or extractor-local location.

## Review Status

Entities and aliases should support review state because automatic extraction
will be noisy.

Initial statuses:

- `approved`;
- `suggested`;
- `rejected`;
- `deprecated`.

Only approved aliases should be used for default query expansion. Suggested
aliases may be included in debug output or internal review surfaces.

## Storage Proposal

Issue #11 implementation should add:

- `entities`;
- `entity_aliases`;
- `entity_mentions`;
- optional `entity_sources` or JSON source metadata when needed.

Recommended constraints:

- unique canonical entity identity by normalized canonical name, type and
  optional vertical;
- unique alias identity by normalized alias text, language, geo and entity;
- indexed aliases by normalized text for lookup;
- indexed mentions by chunk id and entity id;
- foreign keys from aliases and mentions to entities;
- deletion should prefer deprecation over hard deletes.

## Alias Resolution Service

The service should provide:

- exact alias lookup;
- normalized text lookup;
- multilingual alias lookup;
- geo-aware alias lookup;
- approved-only query expansion;
- optional suggested-alias lookup for review/debug flows.

Normalization should remain deterministic and lightweight:

- trim;
- normalize whitespace;
- lowercase using locale-safe defaults;
- strip harmless punctuation only when it does not change meaning;
- preserve original text for evidence and display.

It should not call LLMs or external providers in the MVP.

## Retrieval Integration Contract

Retrieval may ask the Entity and Alias Layer to expand a query:

```ts
interface EntityQueryExpansion {
  originalQuery: string;
  canonicalEntities: EntityReference[];
  aliases: AliasReference[];
  expandedTerms: string[];
}
```

Retrieval should use expansion to:

- add approved aliases as optional keyword terms;
- boost chunks with matching canonical entities or approved aliases;
- expose entity match signals in score breakdowns when available.

Retrieval must not require entity data. If entity lookup is unavailable or
empty, retrieval should continue with vector, keyword and metadata search.

## Context Pack Integration Contract

Context Pack may include entity metadata in future responses:

```ts
interface ContextPackEntity {
  entityId: string;
  canonicalName: string;
  entityType: string;
  aliases: string[];
  sourceIds: string[];
  chunkIds: string[];
  confidence: number;
}
```

Context Pack should use entity metadata to make generation context clearer, not
to replace retrieval evidence.

## Manual and Automatic Flows

Manual flow:

```txt
operator creates canonical entity
  -> operator adds approved aliases
  -> retrieval can expand queries immediately
```

Future automatic flow:

```txt
extraction worker suggests entity or alias
  -> suggestion is stored with evidence
  -> operator or review policy approves/rejects
  -> approved alias becomes available to retrieval/context packs
```

The MVP should support manual creation and lookup first. Automatic suggestions
belong to the future Fact Extraction Worker and review workflow.

## Issue #11 Implementation Scope

Issue #11 implementation may add:

- `packages/entities`;
- entity, alias and mention DTOs;
- entity repository contract;
- database migration;
- alias resolution service;
- manual creation/listing API if needed for testing and operations;
- retrieval integration contract without requiring retrieval to depend on
  entity data;
- context-pack integration contract without requiring Knowledge Pack Builder;
- tests for alias lookup, multilingual aliases and query expansion.

Issue #11 implementation should not add:

- full Knowledge Graph;
- ontology and predicate registry;
- fact extraction worker;
- external enrichment providers;
- LLM-based entity extraction;
- SEO Pack or Knowledge Pack generation.

## Acceptance Criteria

- Canonical entity and alias concepts are explicit and universal.
- Alias lookup supports language and geo metadata.
- Entity mentions can be attached to chunks.
- Query expansion is deterministic and test-covered.
- Retrieval remains functional when no entity data exists.
- Context Pack integration remains model-agnostic.
- Automatic extraction is supported by future contracts but not implemented in
  the MVP.
