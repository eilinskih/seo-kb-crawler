# Site Blueprint Model

- Status: Runtime foundation in current PR.
- Owner: SEO Agent Gateway / autonomous site conveyor boundary.

## Purpose

Site Blueprint is the canonical handoff from SEO KB to a website workspace.

It answers:

```txt
What site should be built from this topic's current SEO evidence?
```

It does not generate pages, write content, create a Next.js repository or
deploy anything. It packages the current research state into a stable site
planning contract that Codex can consume inside a project workspace.

## Product Flow

```txt
Topic seed or keyword list
  -> Topic Work Run
  -> Demand candidate pages
  -> SEO Packs
  -> Site Blueprint
  -> Next.js static-first site workspace
  -> Cloudflare Pages deployment
  -> launch report and indexing handoff
```

## Responsibilities

Site Blueprint owns:

- topic language and geo handoff;
- selected page routes;
- page priority and recommendation visibility;
- technical readiness vs editorial planning recommendation;
- SEO Pack readiness for each included page;
- internal-linking hints between candidate pages;
- sitemap route list;
- Cloudflare Pages deployment constraints;
- degraded/warning visibility for site workspaces.

Site Blueprint does not own:

- keyword discovery;
- SERP acquisition;
- content crawling;
- SEO Pack generation semantics;
- LLM generation;
- Next.js code generation;
- deployment execution;
- indexing submission.

## API Contract

Initial endpoint:

```txt
GET /site-blueprints/topics/:topicId
GET /site-blueprints/topics/:topicId/generation-package
```

Initial MCP tool:

```txt
seo_kb_get_site_blueprint
seo_kb_get_site_generation_package
```

The response includes:

- topic id, slug and name;
- primary language and geo;
- Cloudflare Pages / Next.js static-first deployment constraints;
- exact static export deployment defaults: `npx next build`, `out`,
  `output: "export"`, trailing slashes and unoptimized images;
- included pages with route paths, primary/supporting keywords, page type,
  planning role, recommendation, readiness and priority;
- SEO Pack status per page: `existing` or `needed`;
- internal-linking hints;
- sitemap route paths;
- workspace file expectations and per-page App Router tasks;
- static export kit file contents for baseline workspace files;
- launch readiness status, blockers, warnings and next actions;
- warnings and degraded status.

The generation package endpoint is the preferred one-call input for a website
workspace. It returns the Site Blueprint, the latest SEO Packs referenced by
included blueprint pages, missing SEO Pack candidate keys and package-level
warnings. This avoids every site workspace reimplementing candidate-key
matching.

## Generation Policy

Website workspaces should use Site Blueprint before editing or generating a
site.

For each page:

- `recommendation=create` means the page is a current build candidate.
- `recommendation=merge` means the keyword should strengthen a broader page
  instead of becoming thin standalone content.
- `recommendation=defer` means keep the candidate for later validation,
  provider metrics or stronger evidence.
- `recommendation=reject` pages are excluded from the blueprint.

When `seoPack.status=needed`, the workspace should request or wait for SEO Pack
generation before writing production copy. If a degraded SEO Pack exists, the
workspace must keep uncertainty visible and avoid unsupported claims.

## Deployment Target

Cloudflare Pages is the primary target for generated sites.

The initial blueprint therefore assumes:

- framework: Next.js;
- output mode: static-first;
- build command: `npx next build`;
- build directory: `out`;
- Next config: `output: "export"`, `trailingSlash: true` and unoptimized
  images;
- server-only runtime requirements must be flagged before implementation.

Generated website workspaces should avoid route handlers, server actions,
middleware and runtime image optimization unless the Product Owner explicitly
approves moving that site from Cloudflare Pages static export to a Cloudflare
Workers runtime.

## Static Export Kit

The blueprint may include baseline file contents that a website workspace can
use to bootstrap or synchronize static export support:

- `next.config.ts`;
- `src/data/seo-site-blueprint.ts`;
- `public/robots.txt`.

Files marked `create_or_update` can be generated from the current blueprint.
Files marked `manual_merge` may conflict with existing site-specific settings
and must be merged by the workspace agent rather than blindly overwritten.

## Launch Readiness

Site Blueprint reports launch readiness separately from raw page availability:

- `ready`: static site generation and publication can proceed from current
  evidence.
- `degraded_ready`: static site generation can proceed, but publication needs
  review because SEO Packs, provider evidence or research gaps are incomplete.
- `blocked`: no create-ready page tasks exist, so a useful static site cannot
  be generated yet.

`canGenerateStaticSite` answers whether a website workspace can create a local
draft now. `canPublishWithoutReview` answers whether that draft is safe to
publish without Product Owner or SEO review.

Future deployment adapters may be added, but Cloudflare Pages remains the
default product path unless the Product Owner changes the roadmap.
