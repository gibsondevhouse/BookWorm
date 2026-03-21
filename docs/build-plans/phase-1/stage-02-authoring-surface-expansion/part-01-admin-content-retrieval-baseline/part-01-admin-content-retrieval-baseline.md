# Part 01: Admin Content Retrieval Baseline

## Objective

Provide the first authenticated retrieval surface for the broader Phase 1 content set so editors can work with more than isolated write endpoints.

## Work To Be Done

- add admin list or lookup routes for the expanded entity model
- support retrieval of the latest draft and release-relevant metadata
- define response shaping for admin-facing revision history summaries
- preserve role checks for author-admin and editor access
- provide a minimal verification path for retrieval correctness

## Deliverables

- admin retrieval routes or pages for the expanded content set
- revision summary response shape
- authorization behavior for content retrieval

## Dependencies

- Stage 01 complete enough to query the expanded model
- session authentication baseline from Phase 0

## Completion Check

- authenticated admin users can retrieve the broader content set
- retrieval responses clearly distinguish draft and release-relevant revision data
