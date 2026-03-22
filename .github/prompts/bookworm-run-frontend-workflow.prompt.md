---
name: "BookWorm Run Frontend Workflow"
description: "Kick off a full autonomous BookWorm frontend workflow: identify the next frontend slice, plan it, execute it, sync docs, and audit the result — all without manual handoffs."
argument-hint: "What is the frontend workflow goal? E.g. 'execute the next approved frontend slice', 'plan phase-f-0 stage 1', or 'audit frontend docs after last implementation'."
agent: "BookWorm Workflow Orchestrator"
tools: [read, search, edit, execute, todo, agent]
---

# BookWorm Run Frontend Workflow

Run a complete BookWorm frontend workflow end-to-end.

Steps to coordinate in order:

1. Read `docs/build-plans/frontend-dev/frontend-plan-tracker.md` and the relevant phase/stage docs under `docs/build-plans/frontend-dev/` to determine the current frontend state.
2. Identify the next actionable frontend slice: the first approved slice not yet marked complete.
3. If the slice is not yet planned, delegate to BookWorm Phase Architect to author and approve it first. All frontend planning docs live under `docs/build-plans/frontend-dev/`.
4. Delegate execution of the approved slice: use BookWorm Slice Executor for a single well-scoped named slice, or BookWorm Lead Frontend Coder when scope spans multiple components or surfaces.
5. After execution, delegate a doc sync to BookWorm Phase Architect targeting the frontend planning docs under `docs/build-plans/frontend-dev/`.
6. Delegate a final audit to BookWorm Documentation Auditor to confirm no drift remains between `apps/web` and the frontend plan docs.

Constraints:

- Do not stop after a single sub-step unless a blocker requires explicit human input.
- Do not skip audit at the end of each completed slice.
- Keep all execution strictly within `apps/web`; backend changes (apps/api, schema, scripts) are out of scope for this workflow.
- Surface blockers, unanswered dependencies, or approval gaps immediately rather than guessing past them.

Output at the end:

- The slice that was planned and/or executed.
- Validation results (lint, type-check, and any relevant tests).
- Doc sync and audit outcome.
- The next approved frontend slice or the next required human decision.
