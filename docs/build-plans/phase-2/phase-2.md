# Phase 2

## Purpose

Phase 2 turns the Phase 1 production baseline into the first MVP-shaped product slice. Its job is to complete the core content model, expand the public reading experience, and add the search, continuity, portability, and delivery foundations required for a real self-hostable Book Worm instance.

## Outcome

At the end of Phase 2, the project should have:

- broad entity coverage across the MVP content model
- authenticated admin CRUD coverage for the supported entity and manuscript types
- public codex, timeline, and reader surfaces that resolve from releases
- search behavior that stays release-safe, visibility-safe, and spoiler-safe
- baseline continuity checks with recorded issues and publication guardrails
- import and export flows plus minimum self-hosting guidance for the implemented feature set

## Scope

Phase 2 includes the minimum work needed to cross from a validated multi-entity baseline into an MVP-capable product.

### Included

- remaining schema and service work for the MVP entity set
- admin CRUD, metadata, visibility, spoiler, and timeline handling for the supported content types
- public codex, timeline, archive, and reader baselines tied to release data
- search indexing and query surfaces aligned with role and spoiler rules
- basic continuity issue detection and issue-state handling
- release history browsing, import/export baselines, and self-hosting documentation for the current scope
- verification artifacts that prove the MVP-critical flows hold together

### Excluded

- Beta-only collaboration flows such as comments, proposals, and review queues
- advanced search tuning such as synonyms, typo tolerance, and ranking heuristics beyond the MVP baseline
- deeper continuity rules reserved for later phases, including travel plausibility and inheritance chains
- operational hardening beyond minimum self-host setup, restoreability, and documented local deployment

## Stage Breakdown

1. Stage 01: Comprehensive Entity Management
2. Stage 02: Public Codex and Reader
3. Stage 03: Search and Continuity Foundation
4. Stage 04: Portability and Delivery

## Exit Criteria

- the MVP entity set can be authored through authenticated admin flows with revision and release support
- authenticated admin authoring coverage includes create, update, and retire behaviors for supported content
- public codex, timeline, and reader surfaces resolve only from selected releases
- search returns only content allowed by release, visibility, and spoiler rules
- continuity issues can be generated, listed, and used to block publication when blocking conditions exist
- authors can inspect prior releases and move content in and out of the system through documented import/export flows
- the implemented feature set can be started and validated from documented self-hosting instructions
- phase tracker and part documents are updated to reflect completion state

## Status

**In progress** — 2026-03-19

Stage 01 is complete. The repository now supports the full MVP entity set for authenticated admin create, update, and retire flows, with a shared metadata contract covering spoiler tier, tags, visibility-aware public shaping, and timeline anchors for chronology-sensitive entity types.

Phase 2 remains open because Stages 02 through 04 are still planned work.
