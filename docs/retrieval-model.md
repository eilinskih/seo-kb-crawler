# Hybrid Retrieval Engine Model

- Status: Proposed design for Issue #9 review
- Issue: #9
- Date: 2026-07-07

## Purpose

The Hybrid Retrieval Engine finds the most relevant chunks and source
documents for a query, topic, geo, language, intent and future Context Pack
requests.

Retrieval quality is more important than model sophistication. The engine must
prefer precise, source-rich chunks over generic semantic matches.

It answers:

- Which chunks best answer this query?
- Which source documents and URLs should downstream systems cite?
- Why did each result rank where it did?
- Which filters, matches and fallbacks affected the result set?

## Boundaries

Retrieval owns:

- Retrieval DTOs and query contracts.
- Vector, keyword and metadata query orchestration.
- Ranking profiles and score combination.
- Result explanation/debug output.
- Deduplication and result diversification.
- Degraded retrieval when vectors are missing.

Retrieval does not own:

- Chunk creation.
- Embedding generation.
- Entity extraction or ontology normalization.
- Context Pack assembly.
- SEO page generation.
- Keyword discovery.

## Flow

```txt
retrieval query
  -> query normalization
  -> vector search when embeddings are available
  -> keyword search
  -> metadata filtering
  -> optional entity placeholders
  -> score fusion
  -> deduplication/diversification
  -> ranked retrieval results
```

Retrieval consumes chunks, chunk metadata, source metadata and embeddings. It
must not mutate chunks, embeddings or source documents.

## Retrieval Query

Initial query contract:

```ts
interface RetrievalQuery {
  query: string;
  topicId?: string;
  language?: string;
  geo?: {
    countryCode?: string;
    regionCode?: string;
    city?: string;
  };
  vertical?: string;
  intent?: string;
  entityFilters?: string[];
  chunkTypes?: string[];
  sourceDomains?: string[];
  limit: number;
  rankingProfile: string;
  includeDebug?: boolean;
}
```

The MVP should support topic, language, geo and chunk-type filters. Entity,
intent, vertical and Research Asset filters are placeholders until later
roadmap issues provide canonical data.

## Retrieval Modes

### Vector Search

Vector search uses pgvector embeddings when they exist for the selected
embedding model.

Requirements:

- support selected embedding model identity;
- filter by topic, language, geo and chunk type;
- use the same distance metric recorded with the embedding model;
- never require vectors for the whole system to keep operating.

### Keyword Search

Keyword search should use PostgreSQL full-text search first, with trigram or
ILIKE fallback if needed by the implementation slice.

Keyword search should match:

- chunk text;
- normalized chunk text;
- heading path;
- section title;
- page title;
- source metadata.

Heading and title matches should receive configurable boosts.

### Metadata Search

Metadata search filters and boosts results by:

- topic;
- source domain;
- language;
- geo hints;
- chunk type;
- source URL or canonical URL;
- content/source metadata when available.

### Entity-Aware Placeholder

Issue #9 should prepare interfaces for entity-aware retrieval but must not
require the future Entity and Alias Layer. Exact entity mention matching may be
implemented only when data is already available from chunks or metadata.

## Degraded Mode

Retrieval must work when embeddings are missing, stale or unavailable.

Fallback behavior:

- If no vectors exist, run keyword + metadata retrieval.
- If an embedding model is unavailable, do not fail the query.
- If vector search fails, return keyword/metadata results with a debug warning.
- If a query has no keyword matches, return metadata-filtered candidates only
  when the caller explicitly allows broad fallback.

This mode is less effective than hybrid search, but it preserves local-first
operation and allows projects to continue without provider keys.

## Ranking Profiles

Initial ranking profiles:

- `balanced`: combine vector, keyword, heading, language, geo and freshness.
- `semantic`: favor vector similarity when embeddings are available.
- `keyword_strict`: favor exact and heading/title matches.
- `local_geo`: boost geo hints and local sections.
- `exploration`: allow more domain/document diversity.

Initial score components:

- vector similarity;
- keyword match;
- heading/title match;
- topic match;
- language match;
- geo match;
- chunk type boost;
- freshness placeholder;
- source quality placeholder;

Weights must be configurable and included in debug output.

## Deduplication and Diversity

The engine should avoid returning many near-identical chunks from the same page
unless explicitly requested.

Initial rules:

- collapse exact duplicate chunk hashes;
- prefer one best chunk per document section when results are dense;
- diversify by source domain;
- diversify by document;
- preserve the highest-scoring chunk when collapsing duplicates.

Near-duplicate grouping is a placeholder until a later issue populates
`nearDuplicateGroupId`.

## Output

Initial result contract:

```ts
interface RetrievalResult {
  chunkId: string;
  documentId: string;
  documentVersionId: string;
  topicId: string;
  score: number;
  scoreBreakdown: Record<string, number>;
  matchedTerms: string[];
  language: string | null;
  geoHints: unknown[];
  sourceUrl: string;
  canonicalUrl: string | null;
  sourceDomain: string | null;
  headingPath: string[];
  sectionTitle: string | null;
  chunkType: string;
  text: string;
  debug?: RetrievalDebug;
}
```

Downstream Context Pack code should receive enough information to cite source
URLs and explain why a chunk was selected.

## Storage and Query Layer

Issue #9 may add read-optimized query helpers over existing tables:

- `chunks`
- `chunk_embeddings`
- `embedding_models`
- `documents`
- `document_versions`

New tables are not required for the MVP unless ranking profiles are persisted.
Ranking profile constants may start in code and move to storage later.

Recommended database support:

- pgvector index from Embedding Pipeline;
- full-text `tsvector` expression or generated column for chunk text;
- indexes for topic, language, chunk type and source domain metadata;
- optional trigram extension only if needed.

## Issue #9 Implementation Scope

Issue #9 implementation may add:

- `packages/retrieval`;
- `RetrievalModule`;
- retrieval DTOs;
- ranking profile definitions;
- vector query adapter;
- keyword query adapter;
- metadata filtering adapter;
- score fusion/ranking service;
- deduplication/diversification service;
- tests for vector-only, keyword-only, metadata-only and hybrid retrieval;
- debug score breakdown output.

Issue #9 implementation should not add:

- Context Pack API;
- entity graph requirements;
- fact extraction;
- SEO content generation;
- paid provider dependency;
- mutation of chunks or embeddings.

## Acceptance Criteria

- Retrieval works in keyword/metadata-only degraded mode.
- Retrieval can use vector results when embeddings are available.
- Ranking profile weights are explicit and test-covered.
- Results include score breakdown/debug information.
- Results include source URL, canonical URL, heading path, language and geo
  metadata.
- Duplicate-heavy results are collapsed or diversified.
- Tests cover vector-only, keyword-only and hybrid retrieval paths.
