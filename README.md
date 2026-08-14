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

## Application roadmap

Canonical roadmap order lives in `docs/implementation-order.md`. Current issue
status lives in `docs/progress.md`.

Implemented on `main`:

```txt
/apps/api
/apps/crawler-worker
/apps/embedding-worker
/apps/fact-extraction-worker
/apps/operator-console
/apps/mcp-server
/packages/topic-engine
```

Planned for later roadmap issues and not implemented yet:

```txt
/apps/extraction-worker
```

Current shared and domain packages:

```txt
/packages/db
/packages/common
/packages/discovery-sources
/packages/crawler
/packages/url-frontier
/packages/content-processing
/packages/chunking
/packages/embeddings
/packages/retrieval
/packages/context-pack
/packages/entities
/packages/ontology
```

Planned domain packages:

```txt
/packages/extraction
/packages/demand-engine

/infrastructure/docker
/docs
```

## Documentation map

- `docs/repository-audit.md` records the latest repository stabilization audit.
- `docs/project-map.md` is the first-stop navigation document for engineers.
- `docs/implementation-order.md` is the canonical implementation order and
  dependency guide, and the only canonical roadmap.
- `docs/progress.md` is the live status and work-log tracker.
- `docs/architecture.md` explains current and planned system boundaries.
- `docs/codex-workflow.md` defines working rules, review gates and issue
  sequencing.
- `docs/topic-model.md` documents the implemented Topic Engine contract.
- `docs/url-frontier-model.md` documents the approved URL Frontier design.
- `docs/discovery-sources-model.md` documents the approved Discovery Sources
  design.
- `docs/crawler-worker-model.md` documents the proposed Crawler Worker design.
- `docs/chunking-model.md` documents the implemented Chunking Engine MVP
  contract.
- `docs/embedding-model.md` documents the proposed Embedding Pipeline design.
- `docs/retrieval-model.md` documents the proposed Hybrid Retrieval Engine
  design.
- `docs/context-pack-model.md` documents the Context Pack API contract and
  foundation implementation.
- `docs/entity-alias-model.md` documents the proposed Entity and Alias Layer
  design.
- `docs/ontology-predicate-model.md` documents the proposed Ontology and
  Predicate Registry design.
- `docs/operator-console-model.md` documents the proposed internal Operator
  Console.
- `docs/demand-engine-model.md` documents provider-optional Keyword Discovery
  and candidate-page discovery.
- `docs/mcp-server-model.md` documents the Codex-facing MCP server.
- `docs/decisions/` contains accepted ADRs and the ADR practice guide.

## Engineering Documentation

For contributors and AI-assisted development see:

- `docs/AI_COLLABORATION.md`
- `docs/architecture.md`
- `docs/mcp-server-model.md`
- `docs/progress.md`
- `docs/implementation-order.md`

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

## Foundation development

Requirements:

- Node.js 24.16.0 LTS (use `nvm use`)
- npm
- Docker with Compose
- Ollama for local embeddings

Install and validate the workspace:

```bash
npm install
npm test
npm run build
```

Set up the local embedding model:

```bash
ollama pull bge-m3
ollama list
```

Run the complete local stack:

```bash
cp .env.example .env
docker compose up --build
```

The compose stack starts PostgreSQL, Redis, OpenSERP, API, Operator Console,
Crawler Worker, Embedding Worker and Fact Extraction Worker.

By default Docker Compose uses `EMBEDDING_PROVIDER=ollama` with `bge-m3`
through `http://host.docker.internal:11434`. If Ollama is unavailable,
embedding jobs remain retryable and the rest of the pipeline continues.

Default local endpoints:

```txt
API: http://localhost:3000
API health: http://localhost:3000/health
Operator Console: http://localhost:4010
OpenSERP sidecar: http://localhost:17700
OpenSERP health: http://localhost:17700/health
PostgreSQL: localhost:15432
Redis: localhost:16379
```

MCP server for Codex and agent workspaces:

```bash
npm run build:mcp-server
SEO_KB_API_BASE_URL=http://127.0.0.1:3000 npm run start:mcp-server
```

Docker-based MCP command:

```bash
docker compose --profile mcp run --rm mcp-server
```

For a quick smoke check:

```bash
curl http://localhost:3000/health
curl http://localhost:${OPENSERP_PORT:-17700}/ready
curl -H "x-operator-console-token: ${OPERATOR_CONSOLE_ACCESS_TOKEN:-local-operator-token}" \
  -I http://localhost:${OPERATOR_CONSOLE_PORT:-4010}/
```

Inside Docker, the API uses `OPENSERP_BASE_URL=http://openserp:7000`. On the
host, `.env.example` exposes PostgreSQL, Redis and OpenSERP on non-default
ports (`15432`, `16379`, `17700`) to avoid collisions with other local services.
If you already have a local `.env`, make sure its host ports do not collide
with other Docker stacks before running Compose.

Stop the complete stack:

```bash
docker compose down
```

Issue #2 adds the Topic Engine API:

```txt
POST /topics
GET  /topics
GET  /topics/:id
PUT  /topics/:id/configuration
GET  /topics/:id/snapshots/:version
POST /topics/:id/activate
POST /topics/:id/pause
POST /topics/:id/resume
POST /topics/:id/archive
```

Topic configuration changes use `expectedConfigurationVersion` for optimistic
concurrency and persist immutable snapshots for downstream URL Frontier work.

URL Frontier manual dispatch:

```txt
POST /url-frontier/dispatch
```

Context Pack API:

```txt
POST /context-pack
```

Entity and Alias manual operations:

```txt
POST /entities
POST /entities/:id/aliases
POST /entities/mentions
```

Node.js 24 LTS is used instead of Node.js 26 Current because this service is
intended to run continuously on a secondary machine. LTS provides a longer
support window and lower dependency compatibility risk while retaining a
modern runtime.

## Pull request review

Pull requests are reviewed in this order:

1. Automated tests and builds.
2. CodeRabbit architecture, best-practice, performance and security review.
3. Human review.

Dependabot checks npm, Docker, Docker Compose and GitHub Actions dependencies
weekly. CodeRabbit must be installed for this repository in GitHub for
`.coderabbit.yaml` to take effect.
