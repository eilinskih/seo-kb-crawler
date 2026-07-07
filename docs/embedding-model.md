# Embedding Pipeline Model

- Status: Implemented for the Issue #8 MVP scope
- Issue: #8
- Date: 2026-07-07

## Purpose

The Embedding Pipeline converts semantic chunks into searchable vectors for
PostgreSQL + pgvector.

Embeddings are an index layer, not the source of truth. The source of truth is
the stored document version and chunk text. The system must be able to
re-embed all chunks later with a better provider or model.

The pipeline answers:

- Which chunks need embeddings?
- Which provider/model produced each vector?
- Which embeddings are current, stale or failed?
- Which language, geo and chunk metadata should remain available for filtered
  retrieval?

## Boundaries

Embedding owns:

- Provider abstraction for local and future external embedding providers.
- Batch-oriented embedding job contracts.
- Idempotent storage of vectors and embedding metadata.
- Re-embedding decisions for missing or outdated vectors.
- Provider throttling, retries, backpressure and failure tracking.
- Basic stats by model, language, status and failure category.

Embedding does not own:

- Chunk creation or chunk text mutation.
- Retrieval ranking.
- Context Pack assembly.
- Content extraction or fact extraction.
- Keyword discovery.
- SEO page generation.

## Flow

```txt
chunks
  -> embedding candidate selection
  -> embedding jobs
  -> provider adapter
  -> embedding records + pgvector
  -> retrieval indexes
```

The Embedding Pipeline consumes immutable chunks. It must not translate chunk
text, rewrite chunk text or mutate chunk metadata.

## Provider Strategy

The provider contract must be model-agnostic:

```ts
interface EmbeddingProvider {
  providerKey: string;
  modelKey: string;
  modelVersion: string;
  dimensions: number;
  embed(input: EmbeddingProviderInput[]): Promise<EmbeddingProviderResult[]>;
}
```

Provider identity is part of embedding identity:

```txt
chunkId + providerKey + modelKey + modelVersion + dimensions
```

The first production path should be local-first. Recommended local model
families to evaluate:

- BGE-M3 for multilingual dense embeddings.
- Multilingual E5 for broad multilingual retrieval compatibility.
- Qwen embedding family for future local/provider-backed experiments.

External providers may be added later as adapters, but the platform must not
depend on a paid API key to continue operating.

## Fallback Modes

The repository must keep progressing without Ahrefs, Semrush, SE Ranking,
OpenAI, hosted embedding APIs or any paid provider key.

Embedding fallback behavior:

- If no embedding provider is configured, keep chunks persisted and mark
  embeddings as missing, not failed.
- If a local model is unavailable, record provider-unavailable status and retry
  later according to queue policy.
- If an external provider is unavailable or rate-limited, retry without
  blocking crawler, content processing or chunking workers.
- Retrieval may later use SQL/metadata/keyword fallback when vectors are
  missing, but that belongs to the Retrieval Engine.

This fallback mode is less effective than vector search, but it preserves the
pipeline and allows local-first development.

## Multilingual Support

Embedding must:

- embed original chunk text without translation;
- preserve language and geo metadata for filtered retrieval;
- support EN, RU, UK, PL, DE, ES, PT and future languages through model choice;
- avoid language-specific schema assumptions;
- record model/provider metadata so multilingual model upgrades are possible.

Model selection may use chunk language hints, but initial Issue #8 should
prefer one multilingual model profile over per-language routing.

## Candidate Selection

Embedding candidates are chunks where:

- no current embedding exists for the selected provider/model identity;
- a previous embedding failed with a retryable failure;
- the provider/model version changed;
- dimensions changed;
- chunk text hash changed due to a new chunking run.

Candidate selection must skip:

- empty chunks;
- chunks below the configured value threshold;
- chunks whose latest failure is terminal until manually reset;
- obsolete chunking runs when a newer chunk set is selected.

The skip reason must be observable.

## Job Contract

Initial queue job:

```ts
interface EmbeddingJob {
  jobId: string;
  chunkIds: string[];
  providerKey: string;
  modelKey: string;
  modelVersion: string;
  dimensions: number;
  requestedAt: string;
}
```

Jobs should be batch-oriented. Batch size must be configurable per provider.
The worker must support throttling and backpressure so embedding work does not
block crawler or content-processing workers.

## Storage Proposal

Initial tables:

```txt
embedding_models
chunk_embeddings
embedding_runs
```

`embedding_models`:

- `id`
- `provider_key`
- `model_key`
- `model_version`
- `dimensions`
- `distance_metric`
- `language_profile`
- `status`
- `created_at`
- `updated_at`

`chunk_embeddings`:

- `id`
- `chunk_id`
- `chunking_run_id`
- `document_id`
- `document_version_id`
- `topic_id`
- `embedding_model_id`
- `vector`
- `chunk_content_hash`
- `chunk_normalized_text_hash`
- `language`
- `geo_hints`
- `chunk_type`
- `status`
- `failure`
- `embedded_at`
- `created_at`
- `updated_at`

`embedding_runs`:

- `id`
- `embedding_model_id`
- `status`
- `candidate_count`
- `embedded_count`
- `skipped_count`
- `failed_count`
- `started_at`
- `completed_at`
- `failure`
- `created_at`
- `updated_at`

Suggested constraints and indexes:

- unique `chunk_embeddings.chunk_id + embedding_model_id +
  chunk_content_hash`;
- index `chunk_embeddings.topic_id + language + chunk_type`;
- pgvector index on `chunk_embeddings.vector`;
- status checks for model, embedding and run lifecycle;
- foreign keys to chunks and chunking runs.

Old vectors must not be deleted until replacement vectors are ready.

## Run Lifecycle

```txt
pending
  -> embedding
  -> embedded
  -> skipped
  -> failed_retryable
  -> failed_terminal
```

Model lifecycle:

```txt
active
  -> deprecated
  -> retired
```

Deprecated models may remain queryable while replacement embeddings are being
built. Retired models should not receive new embedding jobs.

## Quality Controls

The Embedding Pipeline should track:

- provider/model identity;
- dimensions;
- batch size;
- token count;
- language;
- geo hints;
- chunk type;
- skipped chunks and skip reasons;
- retryable and terminal failures;
- basic counts per model/language/status.

Initial quality control is operational, not ranking quality. Retrieval quality
evaluation belongs to later Retrieval Engine work.

## Issue #8 Implementation Scope

Issue #8 implementation may add:

- `apps/embedding-worker`;
- `packages/embeddings`;
- embedding provider interface;
- local provider adapter boundary;
- no-provider fallback implementation;
- embedding job contracts;
- Knex migration for embedding tables;
- candidate selection service;
- idempotent persistence service;
- unit tests for idempotency, retries, skipped chunks and model-version
  migration.

Issue #8 implementation should not add:

- retrieval ranking;
- Context Pack API;
- external paid provider dependency as a hard requirement;
- fact extraction;
- automatic content generation;
- changes to chunk text or chunking semantics.

## Acceptance Criteria

- Provider/model identity is persisted with dimensions and version.
- Chunks can be selected for embedding idempotently.
- Missing provider configuration does not break crawler/content/chunking flows.
- Multiple embeddings per chunk are supported for model upgrades.
- Re-embedding can detect missing or outdated embeddings.
- Retryable and terminal failures are distinguishable.
- pgvector storage is proposed or implemented with metadata filtering indexes.
- Tests cover idempotency, retries, skipped chunks and model-version
  migration.
