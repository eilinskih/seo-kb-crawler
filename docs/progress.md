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
| #1 | Foundation: Monorepo bootstrap and local infrastructure | Not started | Start here. |
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
