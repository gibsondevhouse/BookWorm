---
name: "BookWorm Doc Audit"
description: "Audit BookWorm planning or project documentation against the current repository and return findings in approval order."
argument-hint: "What docs, phase, tracker, or feature area should be audited against the repo?"
agent: "BookWorm Documentation Auditor"
tools: [read, search]
---

# BookWorm Doc Audit

Audit the requested BookWorm documentation against the current repository state.

Requirements:

- Read the relevant code, tests, and documentation before drawing conclusions.
- Treat the repository as the source of truth for implemented behavior.
- Separate documentation drift from still-pending planned work.
- Prioritize findings by impact on planning, execution, or team understanding.
- Keep the review concise, evidence-based, and approval-oriented.

Output:

- List findings first, ordered by severity.
- For each finding, name the affected document area, the conflicting repository evidence, and the risk.
- Then list open questions or assumptions.
- End with an approval recommendation: approve, revise, or block.
