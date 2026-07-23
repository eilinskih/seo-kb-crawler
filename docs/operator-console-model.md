# Operator Console Model

- Status: Implemented internal MVP for Issue #86
- Issue: #86
- Date: 2026-07-23

## Purpose

The Operator Console is an internal UI for managing the local SEO Intelligence
Platform without relying on raw HTTP calls.

It exists because real operation will require frequent human decisions:

- adding topics for new SEO projects;
- pausing or archiving obsolete topics;
- adjusting crawl configuration;
- inspecting failed jobs;
- triggering bounded retries;
- checking whether the system is running in full or degraded mode.

The console is an operator interface, not a public SaaS product.

## Boundaries

The Operator Console owns:

- Internal UI workflows for operators.
- Topic and project management screens.
- Topic seed URL, seed keyword and crawl configuration editing workflows.
- Queue/job status views.
- Failure and retry screens.
- Provider/fallback status views.
- Lightweight document, chunk, embedding and retrieval inspection.
- UI state, filters, sort order and operator-facing workflow composition.

The Operator Console does not own:

- Domain rules.
- Crawling, processing, chunking, embedding or retrieval implementation.
- SEO page generation.
- Public customer-facing dashboards.
- Direct database mutation that bypasses service contracts.
- Provider integrations or provider credentials storage.
- Long-running schedulers or worker execution loops.
- Content publishing workflows.

All operator actions should go through existing API or service boundaries.

The console may compose several service/API responses into a useful screen, but
the underlying lifecycle transition must remain owned by the relevant domain
module.

## Product Shape

The Operator Console should be a small internal web application, likely under
`apps/operator-console`, backed by operator-safe API/service contracts.

It should optimize for repeated operations, not marketing presentation:

- dense topic and job tables;
- filters for topic, status, provider mode and retryability;
- bounded action buttons with clear disabled states;
- detail drawers for failures, warnings and recent artifacts;
- compact health summaries;
- no public account, billing or customer-dashboard concepts.

The first implementation should prefer server- or build-time simplicity over a
large frontend framework migration. The console may start with the repository's
existing NestJS/API surface plus a minimal frontend app once the package/app
boundary is accepted.

## Primary Workflows

### Topic Management

Operators should be able to:

- create topics;
- edit topic configuration;
- pause active topics;
- archive obsolete topics;
- reactivate paused topics;
- inspect topic lifecycle state;
- manage seed URLs and seed keywords;
- review language, geo and crawl-policy configuration.
- see when topic policy or crawl configuration makes a URL ineligible.

This is the most important first workflow. Managing active and obsolete topics
only through raw API calls becomes error-prone once many projects exist.

### Crawl Operations

Operators should be able to:

- view URL Frontier state by topic;
- inspect queued, leased, crawled, failed and suppressed URLs;
- trigger bounded discovery or crawl dispatches;
- inspect crawl failures;
- retry eligible crawl work;
- see why URLs were rejected or suppressed.
- avoid unbounded crawl starts by requiring explicit limits for dispatch
  actions.

### Processing Operations

Operators should be able to:

- inspect content-processing runs;
- trigger bounded processing dispatches;
- inspect chunking, embedding and retrieval readiness;
- view retryable and terminal failures;
- trigger retries where the underlying domain service allows it.
- distinguish "not ready yet" from terminal failure.

### Provider and Fallback Status

Operators should be able to see whether the platform is running with:

- full provider-backed capabilities;
- local-only capabilities;
- free/fallback discovery;
- missing embedding provider;
- degraded keyword/metadata-only retrieval.

The UI should make degraded mode visible without treating it as a fatal system
failure.

Provider state should use provider-neutral status from packages such as Demand
Engine, Embeddings, Retrieval and External SEO Data Providers. The console
should not call paid provider SDKs or infer health by querying provider-specific
schemas directly.

### Inspection Views

Initial inspection views may include:

- recent documents;
- extracted metadata;
- chunks and chunk types;
- embedding status by model/language;
- retrieval smoke-test results;
- source URLs and canonical URLs.

These views are for debugging and operator confidence, not content authoring.

## UI/API Boundary

The console should consume operator-facing API/service contracts rather than
database tables.

Expected API/service surfaces:

- Topic Engine: topic create, update, pause, archive, reactivate and policy
  read models.
- URL Frontier: topic-scoped frontier state, dispatch plans, retryable failures
  and bounded dispatch commands.
- Content Processing: successful crawl attempt processing status, retryable
  failures and bounded processing dispatch commands.
- Chunking, Embeddings and Retrieval: readiness summaries and inspection
  read models.
- Context Pack API: retrieval/context preview requests.
- Research Engine Scheduling: focused/manual/background research job state,
  dispatch planning and freshness status.
- External SEO Data Providers: provider/fallback/degraded status and recent
  enrichment warnings.

If an operator screen needs data that no domain module exposes yet, the next
step should be a small operator-safe read model or command in that module, not
a direct database query from the console.

## Screen Model

The minimal console should include:

- Topics list with status, language, geo, crawl policy, recent activity and
  provider/degraded indicators.
- Topic detail with seed URLs, seed keywords, crawl configuration, lifecycle
  actions and recent research/crawl/processing state.
- Frontier view filtered by topic and URL status.
- Jobs/failures view across crawl, content processing, chunking, embeddings,
  retrieval and research scheduling.
- Provider status view for local/free/fallback/paid-provider availability.
- Inspection view for recent documents, chunks, embedding status and Context
  Pack smoke results.

The console should avoid content generation screens in Issue #86. Content
generation, SEO Pack previews and SEO Agent Gateway execution are future
review workflows only, not part of the initial Operator Console scope.

## Action Safety

Operator actions should be explicit and bounded:

- pause, archive and reactivate should affect a selected topic only;
- retry and dispatch actions should require limits or explicit selected items;
- destructive or irreversible actions should be absent from the initial scope;
- failed actions should show domain-returned warnings instead of pretending
  success;
- provider/fallback degraded modes should be warnings, not fatal UI states.

Actions should be idempotent where the domain boundary supports it.

## Dependencies

The Operator Console should not block the current Knowledge Layer.

Recommended dependencies before implementation:

- Topic Engine API;
- URL Frontier operator APIs;
- Content Processing operator APIs;
- Chunking, Embedding and Retrieval foundations;
- Context Pack API for meaningful context previews;
- Research Engine Scheduling for richer operational controls.

## Placement in Roadmap

The Operator Console belongs to an Operations phase after the core API and
scheduling contracts exist.

It may start as a minimal internal web app once topic management and manual
dispatch APIs are stable, but a richer console should wait until Context Pack
and scheduling expose stable operations.

## Initial Implementation Scope

Issue #86 implementation may add:

- an internal operator UI application;
- navigation for topics, frontier, jobs, failures and provider status;
- API clients for existing operator endpoints;
- read-only inspection views for documents, chunks, embeddings and retrieval;
- bounded action buttons for pause/archive/reactivate/retry/dispatch;
- provider/fallback/degraded status cards based on provider-neutral contracts;
- tests for critical operator workflows.

Issue #86 implementation should not add:

- public authentication or SaaS account management;
- customer-facing analytics;
- content generation workflows;
- direct database write paths;
- new crawling or ranking behavior.
- paid provider integrations;
- provider credentials management;
- unbounded crawl, processing or research dispatches.

## Implementation Plan

1. Add an `apps/operator-console` boundary and routing shell.
2. Add typed operator API clients for existing Topic, Frontier, Processing,
   Context Pack, Research Scheduling and provider-status contracts.
3. Build topic list and topic detail workflows first.
4. Add frontier/job/failure read-only views.
5. Add bounded action buttons only where a domain service already exposes a
   safe command.
6. Add provider/fallback status views from provider-neutral status contracts.
7. Add inspection views for recent documents, chunks, embeddings and retrieval
   smoke results.
8. Add tests around critical operator flows and disabled/bounded action states.

The first implementation should keep styling and frontend architecture small
enough that the console remains easy to replace or extend.

## Implementation Notes

The runtime foundation application is `apps/operator-console`.

The initial implementation:

- adds a NestJS Operator Console application;
- serves an internal HTML shell at `/`;
- exposes the same view model as JSON at `/status`;
- defines operator sections for topics, URL Frontier, processing, inspection,
  providers and research scheduling;
- lists enabled actions only where existing API/service contracts already
  exist;
- marks missing read models and unsafe future actions as planned/disabled;
- keeps all mutating action descriptors bounded;
- keeps content generation, publishing, paid provider credentials and direct
  database access out of scope.

The topic workflow implementation:

- adds an operator API client that calls the existing Topic API;
- lists topics through the Topic API;
- adds a topic creation form for slug, name, description, seed URLs, seed
  keywords, language, country and max-page policy;
- adds topic configuration editing for name, description, seed URLs, seed
  keywords, language, country and max-page policy;
- maps the form into the existing Topic Engine configuration contract;
- adds bounded pause, archive and reactivate form actions;
- keeps all topic lifecycle changes behind Topic API endpoints.

The dispatch workflow implementation:

- adds bounded URL Frontier dispatch form support;
- adds bounded Content Processing dispatch form support;
- calls existing API endpoints instead of worker internals;
- caps operator-submitted dispatch limits before forwarding requests;
- leaves retry-specific forms until owning modules expose safe retry commands.

The provider status implementation:

- shows provider-neutral External SEO Data Provider status;
- surfaces fallback/degraded provider warnings in the console;
- uses the External SEO Data Providers service boundary;
- avoids paid-provider SDK calls and credentials management.

The URL Frontier status implementation:

- adds an operator-safe URL Frontier status read model in the owning module;
- exposes URL Frontier status through the API instead of direct console
  database reads;
- shows total entries, status counts, retryable count and recent entries in
  the console.

The jobs/failures/readiness implementation:

- adds read-only Content Processing status summaries;
- adds read-only Chunking status summaries;
- adds read-only Embedding status summaries;
- adds Retrieval readiness derived from chunks and embedded chunks;
- exposes a unified `/operator/status` API endpoint;
- renders pipeline totals, status counts, failure counts, recent failures and
  retrieval degraded mode in the console.

The inspection/health implementation:

- adds recent document inspection from Content Processing;
- adds recent chunk inspection from Chunking;
- adds recent embedding inspection from Embeddings;
- shows retrieval smoke readiness from Retrieval readiness state;
- shows basic document, chunk, embedding, keyword retrieval and vector retrieval health
  signals.

Authenticated access, richer failure/provider detail screens, frontier retry
forms and processing retry forms remain future implementation work.

## Close-Out Status

Issue #86 is complete as an internal operator MVP.

Implemented scope:

- topic create, view, edit, pause, archive and reactivate workflows;
- seed URL, seed keyword, language, geo and crawl-policy editing;
- topic-scoped URL Frontier status visibility;
- bounded URL Frontier and Content Processing dispatch controls;
- jobs, failures and readiness visibility for Content Processing, Chunking,
  Embeddings and Retrieval;
- provider/fallback/degraded status visibility;
- recent document, chunk and embedding inspection;
- retrieval smoke readiness;
- API/service-bound console access without direct UI database reads.

Deferred scope:

- authenticated access and production access control;
- richer per-domain failure/provider detail screens;
- URL Frontier retry-specific forms;
- Content Processing retry-specific forms;
- full Research Scheduling controls;
- production-grade frontend hardening.

## Acceptance Criteria

- Operators can create, pause, archive and reactivate topics through the UI.
- Operators can identify obsolete topics and stop their crawl activity.
- Operators can inspect crawl and processing status without querying the DB.
- Operators can trigger only bounded, explicit dispatch/retry actions.
- Provider/fallback/degraded modes are visible.
- The UI uses API/service contracts rather than direct database mutation.
- The UI does not expose content generation workflows.
- The UI does not require paid provider credentials.
