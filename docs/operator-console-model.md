# Operator Console Model

- Status: Proposed future operational layer
- Issue: #86
- Date: 2026-07-07

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
- Queue/job status views.
- Failure and retry screens.
- Provider/fallback status views.
- Lightweight document, chunk, embedding and retrieval inspection.

The Operator Console does not own:

- Domain rules.
- Crawling, processing, chunking, embedding or retrieval implementation.
- SEO page generation.
- Public customer-facing dashboards.
- Direct database mutation that bypasses service contracts.

All operator actions should go through existing API or service boundaries.

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

### Processing Operations

Operators should be able to:

- inspect content-processing runs;
- trigger bounded processing dispatches;
- inspect chunking, embedding and retrieval readiness;
- view retryable and terminal failures;
- trigger retries where the underlying domain service allows it.

### Provider and Fallback Status

Operators should be able to see whether the platform is running with:

- full provider-backed capabilities;
- local-only capabilities;
- free/fallback discovery;
- missing embedding provider;
- degraded keyword/metadata-only retrieval.

The UI should make degraded mode visible without treating it as a fatal system
failure.

### Inspection Views

Initial inspection views may include:

- recent documents;
- extracted metadata;
- chunks and chunk types;
- embedding status by model/language;
- retrieval smoke-test results;
- source URLs and canonical URLs.

These views are for debugging and operator confidence, not content authoring.

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
- tests for critical operator workflows.

Issue #86 implementation should not add:

- public authentication or SaaS account management;
- customer-facing analytics;
- content generation workflows;
- direct database write paths;
- new crawling or ranking behavior.

## Acceptance Criteria

- Operators can create, pause, archive and reactivate topics through the UI.
- Operators can identify obsolete topics and stop their crawl activity.
- Operators can inspect crawl and processing status without querying the DB.
- Operators can trigger only bounded, explicit dispatch/retry actions.
- Provider/fallback/degraded modes are visible.
- The UI uses API/service contracts rather than direct database mutation.
