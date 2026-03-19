# Phase 0

## Purpose
Phase 0 establishes the real implementation baseline for Book Worm. Its job is to turn resolved planning decisions into a working, buildable system skeleton before broader feature work begins.

## Outcome
At the end of Phase 0, the project should have:
- a committed application structure
- local infrastructure for the selected stack
- a running Express and TypeScript runtime
- session authentication skeleton
- a first Prisma-backed schema and migrations
- release-aware data flow for one representative entity type
- a public read path that only resolves through the active release

## Scope
Phase 0 includes only the minimum work needed to prove the architecture and unblock implementation.

### Included
- repository and application scaffold
- local infrastructure services
- runtime shell and environment configuration
- session and role foundation
- minimal schema for users, sessions, entities, revisions, releases, and release composition
- one first vertical slice through admin draft flow and public active-release rendering
- test and verification baseline for the slice

### Excluded
- full multi-entity CRUD coverage
- continuity rules beyond schema and future extension points
- import/export implementation beyond planning placeholders
- proposal, comments, diff viewer, and other Beta surfaces

## Stage Breakdown
1. Stage 01: Foundation and Bootstrap
2. Stage 02: Core Runtime and Auth
3. Stage 03: Data Model and Release Spine
4. Stage 04: First Vertical Slice

## Exit Criteria
- local stack can start from documented commands
- database migrations run successfully
- a user session can be created and validated
- a draft character revision can be created in admin
- a release can include the chosen revision
- public reads resolve only through the active release
- unreleased draft changes do not leak into the public surface
- phase tracker and part documents are updated to reflect completion state