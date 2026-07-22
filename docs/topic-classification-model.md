# Topic Classification Strategy

- Status: Design proposed for Issue #28
- Issue: #28
- Date: 2026-07-23

## Purpose

Topic Classification describes what kind of subject a topic is primarily about.

It gives downstream knowledge and SEO systems a shared semantic signal without
turning the Topic Engine into a taxonomy engine.

Topic Classification answers:

```txt
What is this topic, semantically?
```

It does not answer:

```txt
What should we crawl?
What should we write?
What facts are true?
```

Those questions remain owned by Topic Engine, Demand Engine, SERP Intelligence
and Knowledge Intelligence respectively.

## Why It Happens After Entities And Ontology

Issue #28 was intentionally deferred until the Entity and Alias Layer and the
Ontology and Predicate Registry existed.

Without those layers, topic classification would become an arbitrary string
field such as `topicType`. That would create drift because every downstream
consumer could interpret the same value differently.

With entities and ontology available, classification can reference accepted
semantic concepts and evidence:

- canonical entity types;
- canonical entities and aliases;
- ontology entity type registry entries;
- future SERP and demand evidence;
- review status and confidence.

## Boundaries

Topic Classification owns:

- the classification vocabulary;
- the `topicClassification` contract;
- confidence, evidence and review-state semantics;
- rules for primary and secondary classifications;
- downstream consumer guidance.

Topic Classification does not own:

- topic lifecycle, crawl policy or relevance policy;
- canonical entity identity;
- ontology and predicate definitions;
- keyword discovery or search demand;
- SERP intent analysis;
- Knowledge Graph facts;
- SEO page scoring;
- content generation.

Topic Engine remains focused on project scope, lifecycle, discovery
configuration, language/geo targeting, crawl policy and relevance policy.

## Classification Shape

Use `topicClassification`, not a single `topicType`.

The model supports a primary classification and optional secondary
classifications because many SEO topics are compound:

```txt
primary: service
secondary: place

primary: product
secondary: brand

primary: procedure
secondary: concept
```

Initial contract:

```ts
interface TopicClassification {
  schemaVersion: 1;
  topicId: string;
  primary: TopicClassificationAssignment;
  secondary: TopicClassificationAssignment[];
  overallConfidence: number;
  reviewStatus: TopicClassificationReviewStatus;
  evidence: TopicClassificationEvidence[];
  createdAt: Date;
  updatedAt: Date;
}

interface TopicClassificationAssignment {
  kind: TopicClassificationKind;
  confidence: number;
  entityTypeKey?: string;
  entityIds?: string[];
  ontologyEntityTypeKeys?: string[];
  notes?: string;
}
```

Initial review statuses:

- `suggested`;
- `approved`;
- `rejected`;
- `deprecated`.

Default consumers should use approved classifications. Suggested
classifications may appear in internal review and debugging flows.

## Initial Classification Vocabulary

The first vocabulary should stay small and reusable:

- `generic`;
- `brand`;
- `product`;
- `person`;
- `place`;
- `organization`;
- `service`;
- `procedure`;
- `event`;
- `software`;
- `technology`;
- `concept`;
- `unknown`.

Vocabulary notes:

- `service` is a market offering, for example legal consulting or SEO audit.
- `procedure` is an action or treatment with process, risks, contraindications
  or aftercare, for example laser hair removal.
- `generic` is a broad subject area without a more useful primary type.
- `unknown` is a temporary fallback and should not be used as an approved final
  classification when better evidence exists.

Future vertical-specific values should be added through ontology review, not by
ad hoc downstream code.

## Evidence Model

Classification must preserve why a topic received a kind.

Initial evidence sources:

- `manual`;
- `entity_signal`;
- `ontology_signal`;
- `topic_text`;
- `serp_signal`;
- `demand_signal`;
- `competitor_signal`.

Initial evidence contract:

```ts
interface TopicClassificationEvidence {
  sourceType: TopicClassificationEvidenceSource;
  sourceId?: string;
  value: string;
  confidence: number;
  note?: string;
}
```

Manual classification is allowed, but it should still produce evidence so the
repository can explain why downstream behavior changed.

## Consumer Rules

Entity and Alias Layer:

- may use topic classification as a hint for entity suggestion review;
- must not change canonical entity identity from classification alone.

Ontology and Predicate Registry:

- may use classification to choose relevant entity type and predicate subsets;
- must not create new entity types or predicates implicitly.

Fact Extraction Worker:

- may use classification as extraction context;
- must still normalize raw facts through the ontology registry.

Demand Engine:

- may use classification to choose provider queries, fallback discovery
  templates and candidate page patterns;
- must continue when no approved classification exists.

SERP Intelligence:

- may compare classification against SERP intent and observed ranking pages;
- should flag conflicts instead of silently overriding approved
  classifications.

Topic Expansion Engine:

- may use classification to generate safer expansion patterns;
- must keep expansions inside accepted Topic Engine scope.

SEO Page Candidate Scoring:

- may use classification as one scoring signal;
- must not score pages from classification alone.

SEO Agent Gateway and Context Pack consumers:

- may expose classification as metadata;
- must not treat it as source evidence for factual claims.

Research Engine Scheduling:

- may use classification for crawl strategy and freshness hints;
- must not bypass crawl policy or relevance policy.

## MVP Implementation Direction

The first implementation should be manual-first and provider-free:

- add a small `topic-classification` package or an equivalent domain boundary;
- define TypeScript contracts for classifications, assignments and evidence;
- add deterministic validation for vocabulary, confidence and review status;
- add persistence only when a consumer needs stored classifications;
- expose classifications as optional metadata to downstream modules;
- avoid LLM or paid-provider classification in the MVP.

The first implementation should not mutate Topic Engine configuration unless a
consumer requires persisted classifications on topics. If storage is needed,
prefer a separate classification table over embedding unstable classification
fields directly into the topic configuration snapshot.

## Non-Goals

Issue #28 does not implement:

- automatic LLM classification;
- SERP-based classification;
- Demand Engine query expansion;
- Knowledge Graph inference;
- SEO scoring;
- content generation;
- vertical-specific taxonomy expansion beyond the initial vocabulary.

## Definition Of Done

Issue #28 is complete when:

- the repository has one documented `topicClassification` model;
- primary and secondary classification semantics are defined;
- the initial vocabulary is documented;
- evidence, confidence and review-state semantics are documented;
- downstream consumers know how to use classification without treating it as
  factual evidence;
- roadmap and progress documents show the issue as ready for the next step.
