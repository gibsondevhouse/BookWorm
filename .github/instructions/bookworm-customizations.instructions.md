---
name: "BookWorm Customization Rules"
description: "Use when creating or updating BookWorm custom agent and prompt files. Covers workflow boundaries, naming, handoffs, and validation rules for .github/agents and .github/prompts."
applyTo: ".github/**"
---

# BookWorm Customization Rules

Apply these rules whenever editing workspace agent or prompt files for BookWorm.

## Workflow Model

- Treat the customization set as a workflow system, not a bag of unrelated personas.
- Preserve the core specialist loop:
  - planning: BookWorm Phase Architect
  - delivery: BookWorm Slice Executor or BookWorm Lead Coder
  - review: BookWorm Documentation Auditor
  - follow-up sync: BookWorm Doc Sync prompt or planning updates
- New agents should have one focused responsibility and should not duplicate an existing role.

## Agent Rules

- Keep descriptions concise, specific, and discovery-friendly.
- Prefer minimal tool sets; do not add `execute` or `edit` unless the agent truly needs them.
- Add `handoffs` only for the next logical workflow steps, usually no more than two or three.
- Hidden orchestration agents should use `user-invocable: false` and delegate instead of doing the specialist work themselves.
- Review-oriented agents must stay read-only.
- Planning agents must stay out of implementation unless explicitly designed to switch modes.
- Implementation agents must require an explicitly named slice or approved target.

## Prompt Rules

- Keep each prompt single-purpose.
- Route prompts to the most specific custom agent with the `agent` frontmatter field.
- Prompts may tighten scope and output requirements, but should not duplicate the full agent body.
- Use prompts for repeatable entry points like doc sync, doc audit, or fixed planning tasks.

## BookWorm Conventions

- Keep all planning and documentation work grounded in repository evidence.
- Refer to phases, stages, slices, trackers, and approval states consistently with the existing BookWorm docs.
- Prefer explicit inputs, checklists, success criteria, and output formats for complex agents.
- Keep language direct and operational rather than aspirational.

## Validation Rules

- After editing an agent or prompt file, validate it against VS Code parsing or diagnostics before considering the change complete.
- Do not add unsupported frontmatter fields or unverified model identifiers.
- Use spaces, not tabs, in YAML frontmatter.
- Keep filenames in lowercase kebab-case and keep agent names human-readable.
