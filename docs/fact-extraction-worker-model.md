# Fact Extraction Worker Model

- Status: Worker queue implementation in review for Issue #13
- Issue: #13
- Date: 2026-07-23

## Purpose

The Fact Extraction Worker turns semantic chunks into reviewable raw facts and,
only when safe, normalized canonical facts.

It is the bridge between retrieved text and durable knowledge.

The worker must treat extractors as candidate generators, not as authorities.
Canonical knowledge is accepted only after predicate and ontology
normalization.

## Design Guardrail

The Fact Extraction Worker must never create arbitrary canonical predicates.

All canonical facts must reference approved Ontology and Predicate Registry
entries. If predicate, object, attributes or entity compatibility cannot be
normalized safely, the result remains pending or rejected with a reason.

```txt
chunk text
  -> candidate raw facts
  -> validation
  -> predicate alias resolution
  -> ontology compatibility checks
  -> pending / rejected / canonical fact
```

## Dependencies

Required foundations:

- Content Processing Pipeline (#6) for document versions and normalized text.
- Chunking Engine (#7) for semantic chunks and chunk types.
- Entity and Alias Layer (#11) for known entity hints and mentions.
- Ontology and Predicate Registry (#12) for predicate normalization and raw /
  canonical fact contracts.
- Topic Classification Strategy (#28) for optional extraction context.

The worker must degrade gracefully when entity mentions or topic
classification are absent. Missing optional context should reduce confidence or
candidate priority, not stop extraction.

## Boundaries

Fact Extraction Worker owns:

- extraction job contracts;
- extraction run tracking;
- candidate chunk selection;
- extraction provider interface;
- raw fact validation;
- predicate normalization orchestration;
- canonical fact creation when normalization is approved;
- pending/rejected fact state and reasons;
- reprocessing decisions for changed chunks, profiles or model versions.

Fact Extraction Worker does not own:

- canonical entity identity;
- entity alias review;
- ontology registry definitions;
- predicate approval;
- source trust scoring;
- SEO consensus;
- Knowledge Pack formatting;
- Context Pack formatting;
- content generation.

## Inputs

Initial extraction input:

- `topicId`;
- `documentId`;
- `documentVersionId`;
- `chunkId`;
- `chunkText`;
- `headingPath`;
- `chunkType`;
- `language`;
- `geoHints`;
- `documentMetadata`;
- known entity aliases and mentions when available;
- approved predicate registry snapshot;
- optional topic classification context.

The worker should receive immutable chunk/document-version references. If a
document is reprocessed into a new version, extraction should run for the new
version rather than mutating facts attached to the old version.

## Candidate Selection

Candidate selection decides which chunks are worth sending to an extractor.

Prioritize chunks with factual structure:

- FAQ;
- guide sections;
- table-like text;
- comparison sections;
- review sections;
- legal or policy sections;
- technical or product/spec sections;
- pricing, availability, compatibility or eligibility language.

Deprioritize or skip:

- navigation;
- footers;
- boilerplate;
- thin marketing copy;
- cookie/privacy banners;
- duplicate chunks;
- chunks below minimum factual signal.

The selection result should explain its decision:

```ts
interface FactExtractionCandidateDecision {
  chunkId: string;
  selected: boolean;
  priority: number;
  reasons: string[];
  skippedReason?: string;
}
```

## Extraction Provider Boundary

Extraction providers are model-agnostic candidate generators.

Initial provider contract:

```ts
interface FactExtractionProvider {
  readonly providerKey: string;
  readonly modelKey: string;
  readonly modelVersion: string;

  extractFacts(input: FactExtractionProviderInput): Promise<RawFactCandidate[]>;
}
```

Provider input should include chunk text, heading path, chunk type, language,
geo hints, known entities, topic classification context and an approved
predicate registry snapshot.

Provider output must be JSON-compatible and must not contain executable
instructions.

Initial raw candidate contract:

```ts
interface RawFactCandidate {
  subjectEntityId?: string;
  subjectCandidate?: string;
  objectCandidate: unknown;
  predicateCandidate: string;
  attributesCandidate: Record<string, unknown>;
  confidence: number;
  fieldConfidence?: Record<string, number>;
  evidenceText?: string;
}
```

The provider may return multiple candidates for one chunk.

## Provider Modes

The implementation should support these modes:

- `noop`: provider is unavailable and returns no candidate facts;
- `stub`: deterministic test provider for contract and normalization tests;
- future `local_model`: local model adapter;
- future `remote_model`: remote model adapter when explicitly configured.

The system must not require paid or hosted model credentials to boot, run tests
or process non-extraction workflows.

## Raw Fact Validation

Raw validation should reject or quarantine candidates that are empty, vague,
unsupported or malformed.

Required validation:

- predicate candidate is present and bounded;
- object candidate is present;
- attributes candidate is JSON-compatible;
- confidence is between 0 and 1;
- source chunk and document version are attached;
- provider identity is attached;
- extraction profile version is attached.

Rejected raw candidates should be stored or counted with a reason when they
come from a real extraction run. Silent dropping makes debugging impossible.

## Predicate Normalization

Predicate normalization uses the Ontology and Predicate Registry.

Normalization rules:

- resolve predicate aliases through approved registry entries;
- prefer language-specific aliases before global aliases;
- prefer vertical-specific aliases before global aliases;
- deprecated predicates cannot create new canonical facts;
- ambiguous aliases remain pending;
- unresolved aliases remain pending or rejected depending on confidence and
  profile policy.

The worker must preserve the original `predicateCandidate` even when it
normalizes successfully.

## Canonical Fact Creation

Canonical facts may be created only when:

- predicate resolution is approved and unambiguous;
- subject entity is known or safely normalized;
- object entity or object value satisfies predicate requirements;
- attribute shape satisfies the predicate attribute schema;
- source chunk and document version are known;
- confidence meets the extraction profile threshold.

Canonical fact provenance should include:

- raw fact id;
- extraction run id;
- source chunk id;
- source document version id;
- provider identity;
- extraction profile version;
- predicate alias resolution details;
- topic classification context when used.

## Storage Model

Issue #12 already introduced `raw_facts` and `canonical_facts` as Ontology
contracts and storage tables. Issue #13 must reuse those tables and contracts
rather than create a competing fact model.

Fact Extraction Worker storage should add worker-owned run and normalization
metadata around the existing fact tables.

Initial storage should support or reuse:

- `fact_extraction_runs` as a new worker-owned table;
- existing `raw_facts` from the Ontology foundation;
- `fact_normalization_attempts` as a new worker-owned table;
- existing `canonical_facts` from the Ontology foundation;
- rejected fact state on `raw_facts`, or a later `rejected_facts` view/table.

Recommended fields:

`fact_extraction_runs`:

- `id`;
- `topic_id`;
- `document_version_id`;
- `chunk_id`;
- `profile_key`;
- `profile_version`;
- `provider_key`;
- `model_key`;
- `model_version`;
- `status`;
- `started_at`;
- `completed_at`;
- `failure_reason`;

`raw_facts`:

- `id`;
- optional `extraction_run_id` if Issue #13 extends the existing table;
- `subject_entity_id`;
- `subject_candidate` only if the raw-fact contract is explicitly extended;
- `object_candidate`;
- `predicate_candidate`;
- `attributes_candidate`;
- `confidence`;
- `field_confidence`;
- `source_chunk_id`;
- optional `source_document_version_id` if Issue #13 extends the existing
  table;
- `evidence_text`;
- `status`;
- `normalization_notes`;
- `created_at`;
- `updated_at`.

`fact_normalization_attempts`:

- `id`;
- `raw_fact_id`;
- `predicate_resolution_status`;
- `predicate_id`;
- `predicate_alias_id`;
- `attribute_validation_status`;
- `object_resolution_status`;
- `canonical_fact_id`;
- `rejection_reason`;
- `created_at`.

`canonical_facts`:

- `id`;
- `subject_entity_id`;
- `object_entity_id`;
- `predicate_id`;
- `normalized_attributes`;
- `source_chunk_id`;
- optional `source_document_version_id` if Issue #13 extends the existing
  table;
- `confidence`;
- `provenance`;
- `created_at`;
- `updated_at`.

Unknown subject candidates must not cause automatic entity creation in Issue
#13. If a raw candidate has no known subject entity, the worker should keep it
pending/rejected with reviewable candidate metadata in the extraction run or
normalization attempt until Entity review can resolve it.

## Job Flow

```txt
fact-extraction.enqueue
  -> load chunk and document-version context
  -> select or skip candidate chunk
  -> create extraction run
  -> call provider
  -> validate raw candidates
  -> store raw facts
  -> normalize predicates and attributes
  -> store normalization attempts
  -> create canonical facts when safe
  -> mark run complete
```

Job contract:

```ts
interface FactExtractionJob {
  jobId: string;
  topicId: string;
  documentVersionId: string;
  chunkId: string;
  requestedAt: Date;
  reason: 'new_chunk' | 'profile_changed' | 'model_changed' | 'manual';
}
```

## Idempotency And Reprocessing

The worker must be idempotent by chunk, document version, extraction profile
and provider/model identity.

Reprocessing should happen when:

- a chunk has never been processed;
- the extraction profile changes;
- the provider/model version changes;
- ontology or predicate aliases change in a way that affects pending facts;
- an operator manually requests re-extraction.

Old canonical facts should remain until replacement facts are validated.
Replacement policy belongs to later Source Trust and Evidence Scoring / SEO
Consensus work. Issue #13 should preserve enough provenance for those layers.

## Topic Classification Context

Topic Classification may be passed to the provider and normalizer as context.

Allowed uses:

- prioritize likely predicates;
- choose relevant ontology subsets;
- improve prompt/profile context;
- explain extraction decisions.

Disallowed uses:

- creating facts from classification alone;
- overriding ontology compatibility;
- treating classification as evidence for factual claims.

## Integration With Codex Context

Fact extraction improves future Knowledge Packs and Context Packs by producing
structured candidate knowledge.

However, Context Pack must not treat raw facts as canonical knowledge.
Until Knowledge Pack Builder and Source Trust layers exist, Codex-facing
outputs should continue to distinguish retrieval evidence from normalized
facts.

## MVP Scope

The first implementation PR should include:

- `packages/fact-extraction` domain contracts and service boundary;
- optional `apps/fact-extraction-worker` or queue integration following
  existing worker patterns;
- extraction provider interface;
- noop and test providers;
- deterministic candidate selection;
- raw candidate validation;
- predicate normalization orchestration through Ontology;
- persistence migration for extraction runs, raw facts and normalization
  attempts;
- canonical fact persistence only when predicate normalization is approved;
- tests for validation, predicate normalization, idempotency and provider
  unavailability.

The foundation implementation introduces the package boundary, provider
interface, noop/test providers, candidate selector, Entity mention hints,
validation and normalization orchestration, extraction-run metadata migration,
dedicated worker app, queue dispatch and tests.

The first implementation should not include:

- production LLM prompts;
- external model-provider credentials;
- source trust scoring;
- SEO consensus;
- Knowledge Pack generation;
- automatic entity creation from unknown candidates;
- advanced replacement/merge policy for conflicting facts.

## Definition Of Done

Issue #13 is complete when:

- the worker can select candidate chunks;
- provider calls go through a model-agnostic interface;
- provider unavailability does not break the repository;
- raw facts preserve source, provider, profile and confidence metadata;
- predicate normalization uses the accepted Ontology registry;
- unsafe mappings remain pending or rejected with reasons;
- canonical facts are created only for approved predicate mappings;
- reprocessing is idempotent by chunk, document version, profile and provider;
- documentation, progress and project map are synchronized.
