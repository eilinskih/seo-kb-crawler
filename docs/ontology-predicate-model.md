# Ontology and Predicate Registry Model

- Status: Foundation implementation complete for Issue #12
- Issue: #12
- Date: 2026-07-08

## Purpose

The Ontology and Predicate Registry prevents extracted knowledge from becoming
a collection of arbitrary model-generated JSON fields.

Before any extracted fact becomes canonical knowledge, its entity types,
predicate and attributes must be normalized through approved registries.

This is the guardrail between future extraction workers and durable knowledge.

## Problem

LLM and parser outputs naturally produce predicate variants:

- `eligibility`;
- `entitled_to`;
- `qualified_for`;
- `applies_to`;
- `is eligible for`.

Some variants may map to one canonical predicate. Others may be wrong,
ambiguous or vertical-specific. The repository needs a registry that decides
which predicates are accepted and how raw fact candidates become canonical
facts.

## Boundaries

Ontology and Predicate Registry owns:

- canonical entity type registry;
- entity type aliases;
- canonical predicate registry;
- predicate aliases;
- attribute schemas for predicates;
- raw fact contracts;
- canonical fact contracts;
- predicate alias resolution;
- pending/rejected/deprecated state for unsafe mappings;
- documentation for adding vertical-specific predicates.

Ontology and Predicate Registry does not own:

- entity alias creation;
- entity mention extraction;
- LLM extraction prompts;
- source trust scoring;
- SEO consensus;
- Knowledge Pack formatting;
- content generation.

## Flow

```txt
future extraction worker output
  -> raw fact candidate
  -> entity type registry lookup
  -> predicate alias resolver
  -> attribute schema validation
  -> pending / rejected / normalized
  -> canonical fact
  -> future Knowledge Pack inputs
```

Raw extracted facts may preserve model-generated fields. Canonical facts must
reference approved registry entries.

## Entity Type Registry

The entity type registry normalizes canonical entity types and optional
vertical-specific extensions.

Initial fields:

- `id`;
- `key`;
- `label`;
- `description`;
- `vertical`;
- `aliases`;
- `examples`;
- `usageNotes`;
- `reviewStatus`;
- `createdAt`;
- `updatedAt`.

Entity type keys should remain stable. Labels and descriptions may evolve.

Review statuses:

- `draft`;
- `approved`;
- `deprecated`.

Approved entity types can be used for canonical facts. Draft types may be used
only for raw candidates or review workflows.

## Predicate Registry

The predicate registry defines canonical predicates.

Initial fields:

- `id`;
- `key`;
- `label`;
- `description`;
- `subjectEntityTypes`;
- `objectEntityTypes`;
- `attributeSchemaKey`;
- `vertical`;
- `aliases`;
- `examples`;
- `usageNotes`;
- `reviewStatus`;
- `createdAt`;
- `updatedAt`.

Predicate keys should be machine-stable and lower snake case, for example:

- `has_price`;
- `available_in_location`;
- `has_contraindication`;
- `requires_document`;
- `compatible_with`;
- `applies_to`;

Review statuses:

- `draft`;
- `approved`;
- `deprecated`.

Only approved predicates can produce canonical facts. Deprecated predicates
must not be selected for new canonical facts, but their aliases may redirect to
approved replacements when an explicit replacement exists.

## Predicate Aliases

Predicate aliases map raw candidate strings to registry predicates.

Initial fields:

- `id`;
- `predicateId`;
- `aliasText`;
- `normalizedAliasText`;
- `language`;
- `vertical`;
- `confidence`;
- `reviewStatus`;
- `createdAt`;
- `updatedAt`.

Alias resolver behavior:

- exact normalized alias match first;
- language-specific aliases before global aliases;
- vertical-specific aliases before global aliases;
- approved aliases only by default;
- draft aliases may produce pending normalization suggestions;
- deprecated aliases should resolve only when they point to an approved
  replacement.

## Attribute Schema Registry

Attribute schemas define expected attribute shape for a predicate.

The schema registry should support:

- primitive values;
- arrays;
- nested objects;
- unit-aware values;
- confidence fields;
- source references;
- optional and required fields.

Initial fields:

- `key`;
- `schema`;
- `description`;
- `examples`;
- `reviewStatus`;
- `createdAt`;
- `updatedAt`.

Schemas should be stored as JSON Schema-compatible definitions when possible.
Runtime validation can start minimal, but the contract should not permit
unbounded arbitrary attributes for canonical facts.

## Raw Fact Contract

Raw facts preserve extraction output before canonicalization.

Initial fields:

- `id`;
- `subjectEntityId`;
- `objectCandidate`;
- `predicateCandidate`;
- `attributesCandidate`;
- `sourceChunkId`;
- `extractionModel`;
- `confidence`;
- `status`;
- `normalizationNotes`;
- `createdAt`;
- `updatedAt`.

Raw fact statuses:

- `pending`;
- `normalized`;
- `rejected`.

Raw facts are evidence and review inputs. They are not canonical knowledge.

## Canonical Fact Contract

Canonical facts are durable normalized knowledge.

Initial fields:

- `id`;
- `subjectEntityId`;
- `objectEntityId`;
- `predicateId`;
- `normalizedAttributes`;
- `sourceChunkId`;
- `confidence`;
- `provenance`;
- `createdAt`;
- `updatedAt`.

Canonical facts must reference:

- an approved predicate;
- approved entity type compatibility rules;
- normalized attributes that satisfy the predicate schema;
- source evidence.

## Normalization Rules

The normalizer should:

- normalize predicate candidate text;
- resolve predicate aliases;
- reject deprecated predicates without approved replacement;
- validate subject/object entity type compatibility;
- validate attributes against the predicate schema;
- produce canonical facts only when the mapping is approved and unambiguous;
- keep uncertain mappings pending.

It should not invent a canonical predicate from a raw model string.

## Seed Registry

Issue #12 implementation should include a small seed registry for global
predicates needed by downstream tests and early fact extraction.

Seed predicates should be conservative and universal, for example:

- `has_price`;
- `available_in_location`;
- `has_requirement`;
- `has_contraindication`;
- `compatible_with`;
- `mentions`;

Vertical-specific predicates should be added only with examples, aliases and
usage notes.

## Integration Points

Entity and Alias Layer:

- provides canonical entity IDs;
- provides entity type context;
- does not decide predicate normalization.

Fact Extraction Worker:

- creates raw fact candidates;
- calls predicate normalization;
- does not write canonical facts directly from model-generated predicate text.

Hybrid Retrieval Engine:

- may later use canonical facts as retrieval metadata;
- must continue working without canonical facts.

Context Pack API:

- may later include canonical facts and unresolved raw fact gaps;
- must not fabricate facts when registry normalization is missing.

## Issue #12 Implementation Scope

Issue #12 implementation may add:

- `packages/ontology`;
- ontology module;
- entity type registry contracts;
- predicate registry contracts;
- attribute schema contracts;
- raw fact and canonical fact contracts;
- database schema migration;
- seed predicate registry;
- predicate alias resolver;
- tests for alias mapping, deprecated predicates and pending review state.

Issue #12 implementation should not add:

- LLM fact extraction;
- entity extraction;
- Knowledge Graph traversal;
- source trust scoring;
- SEO consensus;
- Knowledge Pack generation;
- SEO Pack generation.

## Current Implementation

The foundation implementation adds:

- `packages/ontology`;
- `OntologyModule`;
- predicate alias resolver service;
- seed-backed predicate registry repository;
- global seed predicate registry;
- entity type, predicate, predicate alias, attribute schema, raw fact and
  canonical fact contracts;
- database migration for registry, raw fact and canonical fact tables;
- tests for approved alias mapping, deprecated predicates, draft pending state,
  unknown raw predicate candidates and vertical-specific alias preference.

The implementation does not add LLM fact extraction, Knowledge Graph traversal
or Knowledge Pack generation. Raw extracted predicate strings still cannot
become canonical facts without registry normalization.

## Acceptance Criteria

- Canonical predicates are explicit and reviewable.
- Raw predicate candidates cannot become canonical facts without registry
  normalization.
- Deprecated predicates do not produce new canonical facts.
- Ambiguous or draft mappings remain pending.
- Attribute schemas constrain canonical fact attributes.
- The registry supports global and vertical-specific predicates.
- The integration contract protects future fact extraction from free-form JSON
  drift.
