---
name: "BookWorm Run Next.js Debug Workflow"
description: "Start a focused apps/web Next.js runtime debugging session that isolates root cause with debugger evidence and prepares a fix-ready handoff."
argument-hint: "What apps/web Next.js symptom should be debugged right now? Include reproduction steps and expected vs actual behavior."
agent: "BookWorm Next.js Debugger"
tools: [read, search, execute, edit, agent]
---

# BookWorm Run Next.js Debug Workflow

Run a single-purpose Next.js frontend debugging workflow for `apps/web`.

Steps to execute in order:

1. Gather the symptom clearly: reproduction steps, expected behavior, actual behavior, and where it appears.
2. Choose the debug mode: server-side, client-side (Chrome/Firefox), or full stack.
3. Run or attach using the matching VS Code launch configuration with monorepo-aware cwd for `apps/web`.
4. Isolate root cause with debugger evidence (stack, frame state, variables, network, terminal logs).
5. Reproduce deterministically with the fewest reliable steps.
6. Verify the fix path (directly or by handing off implementation) and re-check behavior.

Output format:

- Hypothesis: one-line root-cause statement.
- Evidence: observed debugger/terminal facts.
- Reproduction: minimal deterministic sequence.
- Fix: exact change or handoff target.
- Validation: checks run and outcomes.
- Residual Risk: what is still uncertain.
