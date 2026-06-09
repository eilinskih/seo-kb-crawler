# SEO KB Crawler

Private internal SEO knowledge-base engine for topic-driven crawling, multilingual semantic indexing, extraction, and Codex-assisted SEO page generation.

## Goal

Build a local-first utility that continuously discovers and crawls relevant websites by configured topics, stores cleaned content in PostgreSQL + pgvector, extracts entities/facts/relations, and exposes a Context Pack API for Codex.

Codex should not generate SEO pages from empty prompts. It should request structured context from this repository's knowledge base and use that context to create multilingual, geo-aware SEO pages.

## Core idea

```txt
Topic definitions
  -> SERP / sitemap / link discovery
  -> URL frontier
  -> crawl workers
  -> content cleaning
  -> chunking
  -> embeddings
  -> SQL + pgvector
  -> entity/fact extraction
  -> hybrid retrieval
  -> context pack API
  -> Codex page generation
```

## Target machine

The system is intended to run on a secondary MacBook Pro A1502 as a local always-on crawler and knowledge node.

Heavy generation is not part of this service. Codex remains responsible for code and page generation. This service provides semantic context, not final articles.

## Main stack

- TypeScript
- Node.js
- NestJS
- PostgreSQL
- pgvector
- Redis
- BullMQ
- Playwright
- Crawl4AI or crawler adapter layer
- Local multilingual embedding model
- Optional local extraction model

## Initial apps

```txt
/apps/api
/apps/crawler-worker
/apps/embedding-worker
/apps/extraction-worker

/packages/db
/packages/topic-engine
/packages/crawler
/packages/chunking
/packages/embeddings
/packages/extraction
/packages/retrieval
/packages/context-pack
/packages/common

/infrastructure/docker
/docs
```

## MVP scope

1. Configure topics.
2. Discover URLs.
3. Score URL relevance.
4. Crawl and clean pages.
5. Chunk content.
6. Generate embeddings.
7. Store SQL metadata + vectors.
8. Retrieve relevant chunks by keyword, geo, language, entity, and intent.
9. Return a Codex-ready context pack.

## Non-goals

- Not a SaaS.
- Not a public API.
- Not an aggressive scraper.
- Not an article generator.
- Not a replacement for Codex.
