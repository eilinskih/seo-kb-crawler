# Repository Audit

Audit date: 2026-07-03

This is a historical stabilization audit. It records repository state at the
time of the documentation stabilization PR. Current implementation status lives
in `docs/progress.md`, and canonical roadmap order lives in
`docs/implementation-order.md`.

## Summary

The repository is a private, local-first NestJS monorepo for an SEO knowledge
platform. `main` contains the foundation runtime, Topic Engine implementation,
URL Frontier design and two accepted ADRs. No open pull requests were found
during the audit.

The most important drift is that GitHub issues are still open even where work
has landed on `main`, and the old roadmap in `docs/progress.md` did not include
newer governance, scheduling, gateway and provider issues. The repository now
has `docs/implementation-order.md` as the only canonical roadmap-order
document, and `docs/progress.md` remains the live status and work-log tracker.

## Branch audit

| Branch | State |
|---|---|
| `main` | Default branch. Contains merged foundation, Topic Engine implementation and URL Frontier design. |
| `issue/1-foundation` | Historical review branch; PR #26 was closed without merge. Equivalent foundation work exists on `main`. |
| `issue/2-topic-engine` | Historical Topic Engine design branch; merged through PR #27. |
| `issue/2-topic-engine-implementation` | Historical Topic Engine implementation branch; merged through PR #31. |
| `issue/3-url-frontier-design` | Historical URL Frontier design branch; merged through PR #29. |
| `issue/4-discovery-sources-design` | Design-only branch for PR #47. Do not treat as canonical until reviewed and merged. |
| Dependabot branches | Dependency updates only; outside this stabilization PR. |

## Pull request audit

Open pull requests: none.

Relevant merged pull requests:

| PR | Result |
|---|---|
| #27 | Merged Topic Engine design documentation and ADR 0002. |
| #29 | Merged URL Frontier design documentation. |
| #31 | Merged Topic Engine implementation. |

## Issue audit

All audited issues are open in GitHub. Their bodies mostly define scope rather
than live state, so this stabilization PR does not rewrite them. Canonical live
status is documented in `docs/progress.md`.

| Issue | Repository status |
|---|---|
| #1 | Done on `main`; GitHub issue remains open. |
| #2 | Implemented on `main`; GitHub issue remains open. |
| #3 | Historical audit state: design approved on `main`; implementation work had not started at audit time. |
| #4 | Design exists on unmerged branch `issue/4-discovery-sources-design`. |
| #5-#10 | Open and not started. |
| #11-#18 | Open and not started. |
| #19-#21 | Open and not started. |
| #30 | Open and deferred until SERP Intelligence (#18). |
| #40 | Open and optional/deferred external SEO provider work. |
| #41 | Open; this PR supplies repository governance documentation. |
| #42 | Open and deferred until #10, #14, #18, #21 and #43. |
| #43 | Open and proposed; depends on Research Engine contracts. |

## Documentation audit

Existing documentation:

- `README.md`: project overview, stack, setup and API endpoint summary.
- `docs/project-map.md`: repository navigation and document ownership map.
- `docs/architecture.md`: architecture overview and accepted boundaries.
- `docs/implementation-order.md`: canonical roadmap and dependency order.
- `docs/progress.md`: live status and work-log tracker.
- `docs/codex-workflow.md`: repository working rules and review sequence.
- `docs/topic-model.md`: Topic Engine design and implementation contract.
- `docs/url-frontier-model.md`: URL Frontier design contract.
- `docs/decisions/0001-foundation.md`: accepted foundation runtime decisions.
- `docs/decisions/0002-nestjs-monorepo-knex.md`: accepted monorepo and Knex decisions.
- `docs/decisions/README.md`: ADR practice guide.

Documentation gaps addressed in this PR:

- Missing canonical implementation order after issues #30 and #40-#43 were
  added.
- Missing repository audit summary.
- Missing project navigation map.
- Missing ADR practice guide.
- Drift between `main`, unmerged working branches and the progress tracker.
- README lacked a documentation map for new engineers.

Remaining documentation gaps:

- Discovery Sources design is in PR #47 and becomes canonical only after review
  and merge.
- Issue #3 requests an ADR document, but URL Frontier design currently lives in
  `docs/url-frontier-model.md` rather than `docs/decisions`.
- GitHub issue closure/status still needs owner review after this PR merges.

## Architecture audit

Accepted decisions are recorded in ADR 0001 and ADR 0002. No new architecture
decision was invented during this stabilization pass.

Current architecture on `main`:

- NestJS monorepo with `apps/api`, `apps/crawler-worker`, `packages/common`,
  `packages/db` and `packages/topic-engine`.
- PostgreSQL is the source of truth.
- Redis and BullMQ provide queue infrastructure.
- Knex owns migrations, query building and transaction boundaries.
- Topic Engine is implemented with PostgreSQL persistence and immutable
  configuration snapshots.
- URL Frontier, Discovery Sources, Crawler Worker behavior, processing,
  chunking, embeddings, retrieval and pack generation are not implemented.

Architectural drift found:

- `docs/url-frontier-model.md` still said "Proposed for review" even though PR
  #29 merged the design.
- `docs/progress.md` still described Issue #2 as waiting on implementation
  review even though PR #31 is merged into `main`.
- Roadmap docs did not include new Research Engine Scheduling, SEO Agent
  Gateway, SERP Intent Analyzer or external provider issues.

## Recommendations before implementation resumes

1. Review this stabilization PR before continuing roadmap work.
2. Decide whether to close or update GitHub issues #1, #2 and #41 after merge.
3. Review `issue/4-discovery-sources-design` separately before merging its
   design into `main`.
4. Decide whether URL Frontier design needs a formal ADR, since issue #3 asked
   for one but the accepted design currently lives in a model document.
5. Keep future roadmap changes in `docs/implementation-order.md` and status
   changes in `docs/progress.md`.
