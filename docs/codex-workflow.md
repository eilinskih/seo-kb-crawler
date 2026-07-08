# Codex Workflow Guide

This document defines how Codex should work inside this repository.

## Mission

Build a private SEO knowledge platform that serves Codex.

The objective is not to create a public search engine.
The objective is not to create a SaaS.
The objective is to help Codex produce better SEO pages, content plans, research outputs and future site structures.

## Working rules

1. Follow `docs/implementation-order.md` unless an issue explicitly states otherwise.
2. Prefer small, reviewable commits.
3. Update docs together with architecture changes.
4. Keep modules loosely coupled.
5. Favor interfaces and adapters over vendor-specific implementations.
6. Keep external providers optional.
7. PostgreSQL is the source of truth.
8. Embeddings are an index, not the source of truth.
9. Canonical facts must go through the ontology registry.
10. Retrieval quality is more important than model sophistication.
11. Every pull request must pass CodeRabbit review before human review.
12. Resolve or explicitly document architecture, performance and security findings.
13. Review Dependabot updates with the same tests and architecture constraints.
14. Use one dedicated branch per issue, named `issue/<number>-<short-name>`.
15. Do not begin the next issue from an unreviewed or unmerged issue branch.
16. Record accepted durable architecture decisions as ADRs in `docs/decisions/`.
17. Keep roadmap order in `docs/implementation-order.md`; keep live status in
    `docs/progress.md`.
18. Design-only architecture corrections may land before their runtime
    implementation slot when explicitly approved by the Product Owner and
    documented in the relevant roadmap entry.

## Required implementation sequence

The canonical implementation order lives only in `docs/implementation-order.md`.
This section is a short phase summary only and must not become a competing
roadmap.

Phase 1:
- #1 Foundation
- #2 Topic Engine
- #3 URL Frontier design
- #41 Implementation order and roadmap governance

Phase 2:
- #4 Discovery Sources
- #5 Crawler Worker
- #3 URL Frontier implementation
- #43 Research Engine Scheduling

Phase 3:
- #6 Content Processing
- #7 Chunking
- #8 Embeddings
- #9 Retrieval
- #10 Context Pack API

Phase 4:
- #11 Entity and Alias Layer
- #12 Ontology and Predicate Registry
- #13 Fact Extraction Worker
- #14 Knowledge Pack Builder
- #15 Trust and Evidence
- #16 SEO Consensus

Phase 5:
- #72 Demand Engine Design
- #98 Demand Engine Runtime
- #18 SERP Intelligence
- #30 SERP Intent Analyzer
- #19 Topic Expansion
- Future issue Long-tail Discovery
- #20 SEO Page Candidate Scoring
- #21 Codex SEO Pack Generator

Phase 6:
- #42 SEO Agent Gateway

Phase 7:
- #17 External Entity Enrichment
- #40 External SEO Data Providers

## A1502 Runtime Profile

Real-time:
- crawler
- processing
- chunking
- embeddings
- retrieval
- context pack generation

Background:
- demand refresh
- fact extraction
- ontology normalization
- trust scoring
- consensus analysis
- SERP intelligence

## Definition of Done

An issue is not Done when code compiles.

An issue becomes Done only when:
- implementation exists
- tests exist
- docs exist
- progress.md updated
- CodeRabbit review completed
- architecture, performance and security findings resolved or accepted
- human review completed

Until then use status: Review needed.

## Review sequence

```txt
implementation
  -> tests and builds
  -> CodeRabbit automated review
  -> fix or document findings
  -> human review
  -> Done
```

CodeRabbit is configured in `.coderabbit.yaml` with path-specific instructions
for NestJS applications, BullMQ workers, shared packages, PostgreSQL, container
infrastructure and architecture documentation.

Dependabot is configured in `.github/dependabot.yml` for npm, Docker, Docker
Compose and GitHub Actions. Dependency pull requests do not bypass issue
sequencing or human review.
