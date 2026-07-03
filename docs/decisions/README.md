# Architecture Decision Records

This directory contains accepted Architecture Decision Records (ADRs).

ADRs are permanent records of decisions that shape the repository over time.
They should explain the context, decision, rationale and consequences of an
accepted architecture choice.

## When to add an ADR

Add an ADR when a pull request accepts a durable decision about:

- application or package boundaries;
- persistence strategy and schema ownership;
- queue, worker or scheduling ownership;
- provider abstractions and fallback behavior;
- security, safety or trust boundaries;
- deployment/runtime shape;
- model-agnostic API contracts;
- decisions that reject a tempting alternative.

Do not add an ADR for routine code changes, local implementation details or
proposals that have not been accepted.

## Process

1. Draft the subsystem design in the relevant `docs/*-model.md` document when
   exploration is still underway.
2. Add or update an ADR when review accepts a durable architecture decision.
3. Link the ADR from `docs/architecture.md`, `docs/project-map.md` or the
   relevant subsystem document.
4. Keep ADRs append-only after merge unless a later ADR supersedes them.

## Naming

Use sequential four-digit filenames:

```txt
0001-foundation.md
0002-nestjs-monorepo-knex.md
0003-short-decision-name.md
```

## Status values

Use one of:

- `Accepted`
- `Superseded by ADR NNNN`

Proposed decisions should stay in subsystem design documents until accepted.
