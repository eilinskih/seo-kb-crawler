# ADR 0002: NestJS Monorepo and Knex Persistence Strategy

- Status: Accepted
- Date: 2026-06-10
- Issue: #2

## Context

The system needs independently runnable NestJS applications, shared domain
packages and explicit PostgreSQL access without coupling domain models to an
ORM. Topic configuration will use relational identity and lifecycle columns
alongside versioned JSONB documents. Later issues will add queue, document,
chunk, entity and retrieval persistence with different query shapes.

The persistence layer must support:

- PostgreSQL-specific features, including JSONB, transactions and pgvector.
- Reviewable SQL migrations.
- Explicit query performance and index decisions.
- Transaction sharing across repository operations.
- Testable repository boundaries.
- A small runtime footprint suitable for the target machine.

## Decision

Keep the single NestJS monorepo and organize code by deployable applications
and reusable packages:

```txt
apps/*
packages/*
```

Applications own process bootstrap, transport adapters and orchestration.
Domain packages own aggregates, value objects, use cases and repository
contracts. Infrastructure packages implement those contracts.

Use Knex as the PostgreSQL query builder, migration runner and transaction
boundary. Do not use an active-record or data-mapper ORM.

The database strategy is:

- `packages/db` owns Knex configuration, connection lifecycle, migrations and
  shared transaction primitives.
- Domain packages define repository interfaces without importing Knex types.
- PostgreSQL repository adapters may use Knex internally.
- Application services receive repository contracts through Nest dependency
  injection.
- Migrations are append-only after merge and contain explicit indexes,
  constraints and PostgreSQL-specific SQL where required.
- Query results are mapped explicitly into domain objects; database rows are
  not domain entities.
- Raw SQL is allowed when Knex cannot express a PostgreSQL or pgvector feature
  clearly, but values must remain parameterized.
- A transaction is created at the application-service boundary when one use
  case updates multiple repositories.

Knex adoption begins with the first domain persistence implementation. This ADR
does not add a dependency or change runtime code by itself.

## Rationale

Knex provides migration and transaction infrastructure while preserving direct
control over SQL. That fits the project better than a full ORM because the
planned workload includes JSONB configuration snapshots, bulk frontier
operations, full-text search and vector queries.

Keeping Knex out of domain contracts prevents persistence concerns from leaking
into Topic, Frontier and retrieval models. NestJS remains the composition
framework rather than the domain architecture.

## Consequences

- SQL and indexes remain visible during review.
- PostgreSQL-specific capabilities are available without ORM escape-hatch
  patterns.
- Repository mapping code is more explicit and requires focused tests.
- Schema migrations need deliberate naming, ordering and rollback decisions.
- Domain tests can run without PostgreSQL; repository integration tests require
  PostgreSQL.
- Future storage adapters remain possible because domain contracts do not
  expose Knex.

## Rejected alternatives

### TypeORM or Prisma

They reduce simple CRUD code but introduce generated or framework-specific
models and make PostgreSQL-specific query behavior less explicit. The expected
query workload is not primarily CRUD.

### Raw `pg` only

It provides maximum control but leaves migration, transaction propagation and
query composition conventions to be built locally. Knex supplies those pieces
without requiring ORM semantics.

### Knex types in domain repositories

This would couple domain packages to persistence and make transaction/query
objects part of business contracts. Knex remains an infrastructure detail.
