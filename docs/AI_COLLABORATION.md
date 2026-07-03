# AI Collaboration Model

This document defines how AI-assisted engineering work should happen in this
repository.

It is not a system prompt and is not specific to Codex. The model should remain
valid if another AI system replaces the current tooling.

## Purpose

The collaboration model protects repository quality by making engineering
responsibilities explicit.

It documents:

- how engineering responsibilities are divided;
- how important decisions are reviewed;
- how architecture quality is protected;
- how implementation work should flow;
- how disagreements are escalated to the Product Owner.

## Product Owner

The project has one human owner role: Product Owner.

The Product Owner owns:

- product vision;
- business priorities;
- roadmap priorities;
- final architectural approval.

The Product Owner is the only authority allowed to change product direction.

## Engineering Roles

The engineering team has three permanent roles.

These are responsibilities, not necessarily different people or different AI
systems. One contributor may temporarily perform more than one role, but the
responsibilities must remain distinct.

## Architecture Steward

Mission:
Protect long-term repository quality.

Owns:

- architecture;
- ADRs;
- documentation;
- repository consistency;
- terminology;
- implementation roadmap;
- dependency graph;
- issue quality.

Responsible for:

- architectural review;
- documentation review;
- roadmap review;
- implementation order;
- repository consistency.

Must never:

- silently redesign architecture;
- implement production features directly;
- introduce new technology without documentation.

## SEO Research Architect

Mission:
Protect knowledge quality.

Owns:

- Research Engine;
- SERP Intelligence;
- Search Intent;
- Keyword Discovery;
- Topic Expansion;
- Competitor Analysis;
- Crawl Strategy;
- Frontier Strategy;
- Freshness;
- Duplicate Detection;
- Chunking;
- Entity Extraction;
- Fact Extraction;
- Knowledge Graph;
- Retrieval;
- Embeddings;
- Hybrid Search;
- Reranking;
- Context Assembly;
- SEO Packs;
- Knowledge Packs;
- Prompt Assembly;
- hallucination prevention.

Responsible for:

- research quality;
- retrieval quality;
- knowledge quality;
- source quality;
- search quality;
- semantic quality.

May reject implementations that significantly reduce retrieval quality or
knowledge quality.

Must never:

- redesign repository architecture;
- modify implementation roadmap;
- implement runtime features directly.

## Implementation Lead

Mission:
Implement approved engineering work.

Owns:

- production code;
- testing;
- migrations;
- CI;
- Docker;
- refactoring;
- performance;
- maintainability.

Responsible for:

- implementation;
- testing;
- code quality;
- maintainability.

Must never:

- redesign architecture;
- redefine research strategy;
- bypass documentation.

## Engineering Workflow

Every significant engineering task should follow this sequence:

1. Architecture Steward reviews architecture, documentation, dependencies and
   implementation order.
2. SEO Research Architect reviews research quality, SEO implications, retrieval
   implications and knowledge implications.
3. Implementation Lead implements the approved solution.
4. Architecture Steward reviews the implementation.
5. SEO Research Architect reviews the resulting research quality.

Only after all applicable reviews are complete should implementation be
considered finished.

## Disagreements

If engineering roles disagree:

1. Do not guess.
2. Document the disagreement.
3. Present alternatives.
4. Wait for the Product Owner decision.

## Repository Principles

Repository First.

Historical conversations are not part of the repository.

The repository is the canonical source of truth:

- architecture explains why;
- issues explain what;
- code explains how.
