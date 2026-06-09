# Implementation Progress

This document is the single lightweight progress tracker for Codex and human review.

Codex must update this file whenever it starts, advances or completes an issue.

## Status legend

- Not started
- In progress
- Blocked
- Review needed
- Done

## Rules for Codex

1. Work on one issue at a time unless explicitly instructed otherwise.
2. Before starting an issue, update its status to `In progress`.
3. When the implementation is complete, update status to `Review needed`, not `Done`.
4. Use `Done` only after human/architect review.
5. Add a short progress note for meaningful implementation steps.
6. If blocked, set status to `Blocked` and explain why.
7. Do not skip architectural docs when the issue requires them.
8. Do not introduce new major architecture without updating docs.
9. Do not generate SEO content directly from retrieval chunks alone.
10. Codex-facing outputs should use Knowledge Pack + SERP Pack when available.

## Current roadmap

| Issue | Title | Status | Notes |
|---|---|---|---|
| #1 | Foundation: Monorepo bootstrap and local infrastructure | Review needed | Implementation, tests and architecture documentation are ready for human review. |
| #2 | Topic Engine: design topic definitions and crawl configuration model | Not started | Depends on #1. |
| #3 | URL Frontier: design discovery queue and crawl scheduling | Not started | Depends on #1 and #2. |
| #4 | Discovery Sources: design URL discovery providers | Not started | Depends on #3. |
| #5 | Crawler Worker: implement controlled page crawling pipeline | Not started | Depends on #3 and #4. |
| #6 | Content Processing Pipeline | Not started | Depends on #5. |
| #7 | Chunking Engine | Not started | Depends on #6. |
| #8 | Embedding Pipeline | Not started | Depends on #7. |
| #9 | Hybrid Retrieval Engine | Not started | Depends on #8. |
| #10 | Codex Context Pack API | Not started | Depends on #9. |
| #11 | Entity and Alias Layer | Not started | Can start after #7, integrates with #9/#10. |
| #12 | Ontology and Predicate Registry | Not started | Required before canonical fact extraction. |
| #13 | Fact Extraction Worker | Not started | Depends on #11 and #12. |
| #14 | Knowledge Pack Builder | Not started | Depends on #9, #11, #12, #13. |
| #15 | Source Trust and Evidence Scoring | Not started | Depends on #13/#14 contracts. |
| #16 | SEO Consensus and Conflict Layer | Not started | Depends on #13/#15. |
| #17 | External Entity Enrichment Providers | Not started | Optional enrichment; must be non-blocking. |
| #18 | SERP Intelligence Layer | Not started | SEO-first layer. |
| #19 | Topic Expansion Engine | Not started | Depends on #18 and knowledge signals. |
| #20 | SEO Page Candidate Scoring | Not started | Depends on #18/#19. |
| #21 | Codex SEO Pack Generator | Not started | Depends on Knowledge Pack and SERP Pack. |

## Active work log

Add entries here in reverse chronological order.

Date: 2026-06-09
Issue: #1
Status: Review needed
Summary:
- Added CodeRabbit as an automated review gate focused on architecture, best
  practices, performance and security vulnerabilities.
- Added Dependabot coverage for npm, Docker, Docker Compose and GitHub Actions.
- Pinned Node.js 26.3.0 in `.nvmrc`, package engines and container images.
- Added the automated-review-before-human-review workflow and PR checklist.
- Added the NestJS monorepo with API and crawler worker applications.
- Added shared common and PostgreSQL packages, BullMQ queue wiring, pgvector and Redis infrastructure.
- Added a dependency-aware API healthcheck, tests, environment template and Docker Compose runtime.
- Documented the foundation architecture in ADR 0001 and updated the architecture overview.
- Verified 4 tests, both production builds, Compose configuration and diff formatting.
- Live Compose startup was not verified because the local Docker daemon was not running.
Changed files:
- .coderabbit.yaml
- .github/dependabot.yml
- .github/pull_request_template.md
- .nvmrc
- apps/api
- apps/crawler-worker
- packages/common
- packages/db
- infrastructure/docker
- Dockerfile
- docker-compose.yml
- .env.example
- package.json
- package-lock.json
- README.md
- docs/architecture.md
- docs/codex-workflow.md
- docs/decisions/0001-foundation.md
- docs/progress.md
Next step:
- Run CodeRabbit review, resolve or accept its findings, then complete human
  review of Issue #1. Do not begin Issue #2 until approved.

Date: 2026-06-09
Issue: #1
Status: In progress
Summary:
- Reviewed the architecture and Codex workflow requirements.
- Started the NestJS monorepo and local infrastructure foundation.
Changed files:
- docs/progress.md
Next step:
- Implement the API, crawler worker, shared packages and Docker Compose services.

### Template

```txt
Date: YYYY-MM-DD
Issue: #N
Status: In progress / Blocked / Review needed / Done
Summary:
- ...
Changed files:
- ...
Next step:
- ...
```
