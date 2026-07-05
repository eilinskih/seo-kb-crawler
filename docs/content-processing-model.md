# Content Processing Model

- Status: Proposed design for Issue #6
- Issue: #6
- Date: 2026-07-04

## Purpose

The Content Processing Pipeline converts successful crawl attempts into
versioned, normalized documents that later systems can safely chunk, embed,
retrieve and analyze.

It answers:

- Which crawled page became a document?
- Which exact crawl attempt produced the document version?
- What raw and normalized body artifacts are available for reprocessing?
- Which metadata, language, geo and structured-data signals were extracted?
- Which content version is current for a Topic and URL identity?

The pipeline does not generate SEO content. It prepares trustworthy document
state for downstream Chunking, Retrieval, Knowledge and SEO Intelligence
layers.

## Boundaries

Content Processing owns:

- Document identity for processed crawl outputs.
- Document version creation from successful crawl attempts.
- Raw HTML, cleaned Markdown and plain text artifact ownership.
- Metadata extraction from fetched content.
- Structured data extraction from HTML.
- Language and geo hints derived from content and crawl context.
- Content hash comparison and version deduplication.
- Processing status, failure classification and reprocessing state.

Content Processing does not own:

- Crawling, rendering, robots policy or network safety.
- URL Frontier lease, retry or recrawl scheduling.
- URL discovery provider execution.
- Chunk boundaries, embedding vectors or retrieval indexes.
- Entity resolution, ontology normalization or fact extraction.
- SERP interpretation or SEO pack generation.
- Publishing or editing generated pages.

## Pipeline Position

```txt
URL Frontier completion
  -> crawl_attempts
  -> Content Processing
  -> documents
  -> document_versions
  -> Chunking Engine
  -> Embedding Pipeline
  -> Hybrid Retrieval
```

The first implementation should read from successful `crawl_attempts` records.
Later orchestration may invoke processing immediately after crawl completion,
but the durable contract is the crawl attempt record, not BullMQ completion.

## Inputs

The initial input is one successful crawl attempt with:

- Attempt ID.
- Frontier entry ID.
- Topic ID.
- Topic configuration version.
- Requested URL and final URL.
- Redirect chain.
- Canonical URL evidence.
- HTTP status and headers.
- Raw HTML.
- Cleaned Markdown when available.
- Plain text when available.
- Content hash.
- Outgoing links and media metadata.
- Adapter key and version.
- Crawl completion timestamp.

Only successful attempts are eligible for normal document version creation.
Retryable, terminal, timed-out and policy-blocked attempts remain crawl history
and do not produce document versions.

## Outputs

The pipeline produces:

- `documents`: stable processed document identity.
- `document_versions`: immutable content versions derived from crawl attempts.
- Processing metadata: status, extractor version, source attempt and timestamps.
- Body artifacts: raw HTML, normalized Markdown and normalized plain text.
- Extracted metadata: title, meta description, canonical URL, headings and
  content hints.
- Structured data observations when available.
- Language and geo hints.
- Reprocessing eligibility markers.

Chunks are not produced by Issue #6. Chunking begins in Issue #7 and consumes
document versions.

## Document Identity

Document identity is topic-scoped.

```txt
Document identity = topicId + frontierEntryId
```

The URL Frontier remains the owner of URL identity, canonical relations and
frontier lifecycle. Content Processing references `frontierEntryId` rather than
re-normalizing URLs.

If a later URL Frontier canonical consolidation changes the canonical entry,
Content Processing must preserve historical document versions and attach future
versions to the canonical identity through an explicit migration or
consolidation step. It must not silently merge documents based only on HTML
canonical tags.

## Versioning Model

Every processed crawl attempt can create a document version, but duplicate
content hashes should not create a new current version unless processing logic
or metadata extraction changed materially.

Initial versioning rules:

- A new document is created when no document exists for the Topic/frontier
  entry pair.
- A new document version is created when content hash differs from the current
  version.
- If content hash is unchanged, the latest crawl attempt may update crawl
  observation metadata without replacing the current document version.
- Processing extractor version changes may trigger explicit reprocessing.
- Failed processing attempts are recorded separately and do not replace the
  current successful version.

Document versions are immutable after creation.

## Artifact Strategy

Raw HTML, Markdown and plain text must remain available for reprocessing.

Initial local implementation may store bounded text artifacts in PostgreSQL
because the crawler already stores bounded crawl attempt bodies there. The model
must keep an artifact-reference boundary so the storage backend can later move
large or cold artifacts to compressed files or object storage without changing
downstream contracts.

Artifact fields:

- `rawHtmlRef` or bounded inline raw HTML.
- `cleanedMarkdownRef` or bounded inline Markdown.
- `plainTextRef` or bounded inline plain text.
- `contentHash`.
- `artifactByteLengths`.
- `compression` when compressed storage is introduced.

Raw HTML should be compressed when moved out of the initial inline storage path.

## Normalization

Content normalization should be deterministic and extractor-versioned.

Initial normalization stages:

1. Validate that the crawl attempt is successful and has usable HTML or text.
2. Preserve raw HTML exactly as received from the crawler.
3. Extract or normalize title and meta description.
4. Extract headings and visible text candidates.
5. Produce normalized plain text.
6. Preserve adapter-provided Markdown when trustworthy, otherwise mark it as
   unavailable for later reprocessing.
7. Extract basic structured data blocks.
8. Produce language and geo hints as observations, not final truth.

The pipeline must not treat adapter-provided Markdown as canonical fact. It is
an artifact and may be regenerated by later processors.

## Metadata Extraction

Initial metadata should include:

- Title.
- Meta description.
- Canonical URL from crawl evidence.
- Heading outline.
- Open Graph and Twitter card fields when present.
- HTTP content type and selected cache headers.
- Word and character counts.
- Main language hint.
- Geo hints from URL, HTML attributes, structured data and visible content.

Metadata extraction is evidence for later scoring. It is not a final SEO
recommendation.

## Structured Data

Structured data extraction should capture bounded observations from:

- JSON-LD script blocks.
- Microdata when practical.
- RDFa only if a parser is later introduced.

Initial implementation may store JSON-LD observations without deep ontology
normalization. Ontology and predicate normalization belong to later Knowledge
Layer issues.

## Processing State

Processing state is separate from crawl state.

```txt
pending
  -> processing
  -> processed
  -> failed_retryable
  -> failed_terminal
  -> skipped_duplicate
```

- `pending`: successful crawl attempt is eligible for processing.
- `processing`: processor has claimed the attempt.
- `processed`: document version or metadata update completed.
- `failed_retryable`: transient processing failure.
- `failed_terminal`: malformed or unsupported content cannot be processed.
- `skipped_duplicate`: content hash matched the current successful version.

The URL Frontier must not depend on Content Processing state for lease
completion. Content Processing may later influence future relevance or freshness
signals through explicit feedback contracts.

## Idempotency

Processing must be idempotent by crawl attempt ID.

Required guards:

- One processing record per crawl attempt.
- Document version creation must be transactional with processing completion.
- Re-running the same processing job must not create duplicate versions.
- Duplicate content hashes must not churn current document pointers.

## Failure Handling

Retryable failures include:

- Temporary database failures.
- Temporary artifact storage failures.
- Parser timeout within a bounded processing deadline.

Terminal failures include:

- Missing usable body for a successful crawl.
- Unsupported content type.
- Body exceeds accepted processing limits.
- Malformed content that deterministic parsers cannot handle safely.

Processing failures do not change crawl attempt status. They are processing
state owned by Content Processing.

## Security And Safety

Content Processing must treat crawled content as untrusted input.

Rules:

- Do not execute scripts.
- Do not fetch external resources during processing.
- Bound HTML size, text size, JSON-LD block count and metadata size.
- Avoid user-provided regular expressions.
- Store sanitized excerpts only where later UI/API exposure is expected.
- Preserve raw artifacts for internal reprocessing, not direct presentation.

## Relationship To Downstream Systems

### Chunking Engine

Chunking consumes processed document versions, not raw crawl attempts. It should
receive stable document version IDs and normalized text/Markdown artifacts.

### Embedding Pipeline

Embeddings are indexes over chunks. Content Processing does not call embedding
providers.

### Retrieval

Retrieval should cite document versions and source crawl attempts through stable
IDs. It should not retrieve directly from crawl attempt rows once documents
exist.

### Knowledge Layer

Entity, fact and trust layers consume document versions and extracted metadata
as evidence. They own ontology and predicate interpretation.

## Initial Implementation Sequence

1. Add Content Processing package boundary, domain contracts and persistence
   migrations.
2. Add idempotent processing service for successful crawl attempts.
3. Store initial `documents`, `document_versions` and processing status.
4. Add a bounded manual processing API or service entry point.
5. Add worker orchestration only after the service boundary is reviewed.
   Initial orchestration uses a dedicated `content-processing` BullMQ queue,
   bounded manual dispatch, crawl attempt IDs as job IDs and durable
   `content_processing_runs` state transitions before and after queued work.
6. Defer Chunking until Issue #7.

## Out Of Scope For Issue #6

- Chunk generation.
- Embeddings.
- Retrieval indexes.
- Entity resolution.
- Fact extraction.
- SEO recommendations.
- SERP analysis.
- URL Frontier canonical consolidation.
- Discovery observation ingestion.
- External content enrichment providers.

## Open Review Questions

1. Should initial raw HTML and text artifacts remain inline in PostgreSQL, or
   should Issue #6 introduce filesystem artifact references immediately?
2. Should duplicate content hashes create processing records marked
   `skipped_duplicate`, or only update the existing document crawl metadata?
3. Which extractor versioning scheme should be accepted before reprocessing is
   implemented?
4. Resolved for initial implementation: processing supports both a synchronous
   bounded manual API for one crawl attempt and a dedicated BullMQ processor for
   queued batches. Queued processing records `pending`, `processing` and
   failure states in PostgreSQL; BullMQ is transport, not durable processing
   state. Automatic URL Frontier completion hooks remain a later explicit
   decision.
