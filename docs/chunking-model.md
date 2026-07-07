# Chunking Engine Model

- Status: Proposed design for Issue #7 review
- Issue: #7
- Date: 2026-07-06

## Purpose

The Chunking Engine converts processed document versions into semantic,
SEO-aware chunks for embeddings, retrieval, fact extraction and model-agnostic
context packs.

It answers:

- Which stable text fragments should be embedded and retrieved?
- Which headings, metadata, language and geo signals belong to each fragment?
- Which chunks preserve a meaningful section, FAQ item, list, table or page
  block?
- Which document version produced the chunk set?

Chunking quality directly controls embedding quality, extraction quality,
retrieval quality and downstream LLM output quality. Prefer fewer high-quality
semantic chunks over many arbitrary text fragments.

## Boundaries

Chunking owns:

- Chunk set creation for a `document_version`.
- Heading-aware section segmentation.
- Semantic boundary preservation for paragraphs, lists, FAQ blocks and tables.
- Token-aware sizing and overlap.
- Chunk type classification with confidence.
- Stable chunk ordering.
- Chunk content hashes and normalized text hashes.
- Rechunking when chunker version or profile changes.

Chunking does not own:

- Crawling or content fetching.
- Document identity or document version creation.
- HTML metadata extraction.
- Embedding vectors.
- Retrieval ranking.
- Entity resolution, ontology normalization or fact extraction.
- SEO recommendations or content generation.

## Pipeline Position

```txt
Content Processing
  -> documents
  -> document_versions
  -> Chunking Engine
  -> chunks
  -> Embedding Pipeline
  -> Hybrid Retrieval
  -> Entity / Fact Extraction
  -> Context Pack API
```

Chunking consumes immutable `document_versions`. It must not mutate document
versions and must not depend on crawl attempts directly.

## Inputs

Initial chunking input is one processed document version:

- Document ID.
- Document version ID.
- Topic ID.
- Frontier entry ID.
- Topic configuration version.
- Requested URL.
- Final URL.
- Canonical URL.
- Page title.
- Meta description.
- Cleaned Markdown.
- Plain text.
- Extracted heading observations.
- Structured data observations.
- Language hints.
- Geo hints.
- Document metadata.
- Document content hash.
- Extractor version.

If cleaned Markdown is unavailable, the Chunking Engine may fall back to plain
text and mark the input quality accordingly.

## Outputs

The Chunking Engine produces:

- `chunks`: immutable chunk records for a document version and chunker version.
- Chunk text and optional normalized text.
- Heading path.
- Section title.
- Chunk type.
- Chunk type confidence.
- Token count.
- Language.
- Geo hints.
- Source document metadata copied to each chunk.
- Position within document.
- Content hash and normalized text hash.
- Placeholder near-duplicate group fields for later issues.
- Chunking run status and failure metadata.

## Chunk Identity

Chunks are versioned by document version, chunker version and tokenizer
identity.

```txt
Chunk set identity = documentVersionId + chunkerVersion + chunkingProfile + tokenizerKey + tokenizerVersion
```

Chunk records are immutable after creation. If chunking logic changes, create a
new chunk set with a new `chunkerVersion`, profile or tokenizer identity. Do
not rewrite historical chunks in place.

## Chunking Profiles

Initial profiles:

- `short_seo_page`: service pages, landing pages and concise product pages.
- `long_guide`: long informational guides and tutorials.
- `review`: review/comparison pages with pros, cons and ratings sections.
- `forum`: forum or discussion-like content with weak heading structure.
- `default`: safe fallback when the page type is unknown.

Profiles configure:

- minimum token target;
- maximum token limit;
- overlap token target;
- whether overlap is allowed across headings;
- list/table preservation preference;
- FAQ pair preservation preference;
- fallback behavior when headings are missing.

Profile selection may use document metadata and headings as weak signals. It
must remain deterministic and explainable.

## Heading-Aware Segmentation

The first segmentation pass should build sections from heading observations and
Markdown structure.

Rules:

- Preserve H1/H2/H3 hierarchy in `headingPath`.
- Store the nearest heading as `sectionTitle`.
- Do not split a small section merely because it has multiple paragraphs.
- Prefer splitting long sections at paragraph, list, FAQ or table boundaries.
- Never invent heading hierarchy that is not present in the input.
- If headings are missing, leave `headingPath` empty and store the page title
  in `sectionTitle` or fallback metadata.

Initial `headingPath` format:

```txt
["Laser Hair Removal", "Prices", "Bikini"]
```

## Semantic Boundaries

Boundary priority:

1. FAQ question-answer pair.
2. Table block.
3. List block.
4. Paragraph.
5. Sentence-like text unit.
6. Bounded fallback split for oversized units.

The engine should avoid arbitrary character-based splitting until all semantic
boundaries fail.

FAQ handling:

- Keep a question and its answer together when possible.
- Mark chunk type as `faq` when confidence is high.
- If one FAQ answer exceeds the maximum token limit, split inside the answer
  with overlap and retain the same question in metadata.

Table handling:

- Preserve table rows together where possible.
- Prefer one table chunk for small tables.
- For large tables, split by row groups and preserve table heading/caption in
  metadata.

List handling:

- Preserve list items together when possible.
- Split long lists by item groups instead of by raw characters.

## Token-Aware Sizing

Chunking uses a tokenizer abstraction.

Initial tokenizer contract:

- count tokens for text;
- optionally truncate to a token limit;
- expose tokenizer key/version;
- remain deterministic for tests.

The first implementation must use the same tokenizer contract as production for
persisted chunking. Any approximation is test-only or explicitly
non-persistent. Persisted token counts and `maxTokens` decisions must be based
on the tokenizer key/version recorded with the chunking run.

Sizing rules:

- Respect profile `maxTokens`.
- Avoid chunks below `minTokens` when merging adjacent compatible units is
  possible.
- Use overlap only when a semantic section must be split.
- Do not overlap across unrelated headings unless the profile explicitly allows
  it.
- Record `tokenCount` from the tokenizer abstraction used for the chunk.

## Chunk Types

Initial chunk types:

- `intro`
- `section`
- `guide`
- `review`
- `faq`
- `table`
- `list`
- `comparison`
- `local_section`
- `conclusion`
- `unknown`

Chunk type classification uses weak deterministic signals from headings,
metadata, structured data and text patterns. It must include confidence:

```txt
high
medium
low
unknown
```

Classification should be conservative. Unknown is better than a false label.
Vertical-specific concepts such as bonus, payment method, gameplay, provider,
legal procedure or product feature belong to later entity, ontology or
vertical-tag layers. They must not be required by the initial universal chunk
schema.

## Multilingual Support

Chunking must:

- keep original language;
- keep language hints from Content Processing;
- keep geo hints from Content Processing;
- store localized heading paths as observed;
- not translate chunks;
- preserve text needed for later alias/entity normalization.

If multiple language hints exist, the chunk should keep the best available
language tag plus the full hint set in metadata.

## SEO Context Preservation

Every chunk should carry enough document context to be useful outside its page:

- topic ID;
- document ID;
- document version ID;
- frontier entry ID;
- source domain when derivable;
- requested URL;
- final URL;
- canonical URL;
- page title;
- meta description;
- heading path;
- section title;
- language;
- geo hints;
- chunk position;
- chunker version;
- chunking profile.

Breadcrumbs should be preserved when Content Processing later exposes them.

## Deduplication Support

Each chunk stores:

- `contentHash`: hash of exact chunk text.
- `normalizedTextHash`: hash of normalized text.
- `nearDuplicateGroupId`: nullable placeholder for later near-duplicate
  grouping.

Normalized hashing should normalize whitespace and casing but must not remove
meaningful words or translate text.

## Storage Proposal

Initial tables:

```txt
chunking_runs
chunks
```

`chunking_runs`:

- `id`
- `document_id`
- `document_version_id`
- `topic_id`
- `status`
- `chunker_version`
- `chunking_profile`
- `tokenizer_key`
- `tokenizer_version`
- `failure`
- `started_at`
- `completed_at`
- `created_at`
- `updated_at`

`chunks`:

- `id`
- `chunking_run_id`
- `document_id`
- `document_version_id`
- `topic_id`
- `frontier_entry_id`
- `chunk_index`
- `text`
- `normalized_text`
- `heading_path`
- `section_title`
- `chunk_type`
- `chunk_type_confidence`
- `token_count`
- `language`
- `language_hints`
- `geo_hints`
- `source_metadata`
- `content_hash`
- `normalized_text_hash`
- `near_duplicate_group_id`
- `created_at`

Suggested constraints and indexes:

- unique `chunking_runs.document_version_id + chunker_version +
  chunking_profile + tokenizer_key + tokenizer_version`;
- unique `chunks.chunking_run_id + chunk_index`;
- index `document_version_id`;
- index `topic_id + chunk_type`;
- index `content_hash`;
- index `normalized_text_hash`;
- status check for chunking run lifecycle;
- chunk type check for known chunk types.

## Run Lifecycle

```txt
pending
  -> chunking
  -> chunked
  -> failed_retryable
  -> failed_terminal
```

Chunking must be idempotent for the same `documentVersionId`,
`chunkerVersion`, profile and tokenizer identity.

If the same tuple has already been chunked, the service should return an
`already_chunked` outcome from the application boundary rather than inserting a
new durable lifecycle state. Content freshness and duplicate document-version
reuse remain Content Processing responsibilities.

Retryable failures:

- temporary database failure;
- tokenizer initialization failure;
- temporary artifact read failure.

Terminal failures:

- missing usable text;
- unsupported document artifact state;
- malformed input that cannot be segmented safely.

## Initial Implementation Scope

Issue #7 implementation may add:

- `packages/chunking`;
- `ChunkingModule`;
- chunking domain types;
- tokenizer abstraction;
- deterministic fallback tokenizer;
- heading-aware and semantic-boundary planner;
- chunk type classifier;
- Knex migration for chunking tables;
- repository contract and Knex adapter;
- fixtures for headings, FAQ, tables and multilingual pages;
- unit tests for boundary preservation, token limits, hash stability,
  idempotency and profile behavior.

Issue #7 implementation should not add:

- embedding vectors;
- retrieval indexes;
- entity extraction;
- ontology normalization;
- LLM-based chunk classification;
- generated SEO content.

## Acceptance Criteria

- Chunks are produced from processed document versions only.
- Heading paths and section titles are preserved.
- FAQ pairs stay together when possible.
- Table rows and list items are preserved where possible.
- Token limits are enforced through a tokenizer abstraction.
- Chunk type and confidence are stored.
- Language and geo hints are carried forward.
- Source metadata is available on every chunk.
- The same document version, chunker version, profile and tokenizer identity
  cannot create duplicate chunk sets.
- Chunk hashes are stable across repeated runs.
- Re-running the same chunking input is idempotent.
- Tests cover headings, FAQ, tables, token limits, multilingual pages and hash
  stability.

## Review Questions

1. Should the first implementation include BullMQ dispatch for pending document
   versions, or should Issue #7 start with a synchronous service and repository
   boundary?
2. Should `normalized_text` be persisted immediately, or derived later by the
   Embedding Pipeline?
3. Which vertical-specific chunk tags should be introduced later outside the
   universal chunk schema?
