---
name: "BookWorm Run Workflow"
description: "Kick off a full autonomous BookWorm workflow: identify the next slice, plan it, execute it, sync docs, and audit the result — all without manual handoffs."
argument-hint: "What is the workflow goal? E.g. 'execute the next approved slice', 'plan and execute phase 2 stage 1', or 'audit and sync docs after last implementation'."
agent: "BookWorm Workflow Orchestrator"
tools: [read, search, edit, execute, todo, agent]
---
Run a complete BookWorm workflow end-to-end.

Steps to coordinate in order:
1. Read `docs/build-plans/master-plan-tracker.md` and the relevant phase/stage docs to determine the current state.
2. Identify the next actionable slice: the first approved slice not yet marked complete.
3. If the slice is not yet planned, delegate to BookWorm Phase Architect to author and approve it first.
4. Delegate execution of the approved slice to BookWorm Slice Executor.
5. After execution, delegate a doc sync to BookWorm Phase Architect via the Doc Sync prompt.
6. Delegate a final audit to BookWorm Documentation Auditor to confirm no drift remains.

Constraints:
- Do not stop after a single sub-step unless a blocker requires explicit human input.
- Do not skip audit at the end of each completed slice.
- Surface blockers, unanswered dependencies, or approval gaps immediately rather than guessing past them.

Output at the end:
- The slice that was planned and/or executed.
- Validation results.
- Doc sync and audit outcome.
- The next approved slice or the next required human decision.
