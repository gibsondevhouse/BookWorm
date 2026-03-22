# BookWorm Frontend Build Plan Tracker

> **Frontend Track — Parallel to Backend Phases**
>
> This tracker covers the `apps/web` frontend development track. It runs in parallel with the
> backend phase sequence (phases 0–6). Frontend phases are numbered `phase-f-0`, `phase-f-1`, etc.
>
> The frontend track is scoped exclusively to `apps/web` (Next.js 15 App Router, TypeScript strict,
> Tailwind CSS v4). It does not own backend API routes, Prisma schema changes, or `apps/api`.
>
> Phase-f-0 is the **interaction-quality baseline** for the composer, chat surface, and root shell.
> It extends the visual language established in Phase 6 Stage 02 without waiting for Phase 6 Stage 03
> to close. Execution is safe because phase-f-0 targets `page.tsx` and `globals.css` — surfaces that
> Phase 6 Stage 03 (admin surfaces) does not own.

## Status Legend

- [ ] Not started
- [-] In progress
- [x] Completed
- [!] Blocked

## Phase Overview

### Phase-f-0

- [x] [Phase-f-0 Overview](./phase-f-0/phase-f-0.md)

#### Phase-f-0 Stage-f0-01

- [x] [Stage-f0-01 Overview](./phase-f-0/stage-f0-01-composer-interaction-baseline/stage-f0-01-composer-interaction-baseline.md)
- [x] [Slice-01: Composer Interaction and Typography Baseline](./phase-f-0/stage-f0-01-composer-interaction-baseline/stage-f0-01-slice-01-composer-interaction-and-typography-baseline.md)

#### Phase-f-0 Stage-f0-02

- [x] [Stage-f0-02 Overview](./phase-f-0/stage-f0-02-chat-surface-and-markdown-output/stage-f0-02-chat-surface-and-markdown-output.md)
- [x] [Slice-01: Chat Message State, User/Assistant Layout, and Markdown Output](./phase-f-0/stage-f0-02-chat-surface-and-markdown-output/stage-f0-02-slice-01-chat-message-state-and-markdown-output.md)

#### Phase-f-0 Stage-f0-03

- [x] [Stage-f0-03 Overview](./phase-f-0/stage-f0-03-root-shell-behavioral-polish/stage-f0-03-root-shell-behavioral-polish.md)
- [x] [Slice-01: Root Shell Behavioral Polish](./phase-f-0/stage-f0-03-root-shell-behavioral-polish/stage-f0-03-slice-01-root-shell-behavioral-polish.md)

### Phase-f-1

- [-] [Phase-f-1 Overview](./phase-f-1/phase-f-1.md)

#### Phase-f-1 Stage-f1-01

- [x] [Stage-f1-01 Overview](./phase-f-1/stage-f1-01-chat-surface-modularization/stage-f1-01-chat-surface-modularization.md)
- [x] [Slice-01: Chat Surface Component Extraction and Submit Flow](./phase-f-1/stage-f1-01-chat-surface-modularization/stage-f1-01-slice-01-chat-surface-component-extraction-and-submit-flow.md)

#### Phase-f-1 Stage-f1-02

- [x] [Stage-f1-02 Overview](./phase-f-1/stage-f1-02-sidebar-navigation-state-alignment/stage-f1-02-sidebar-navigation-state-alignment.md)
- [x] [Slice-01: Sidebar Navigation Data Extraction and Active Link Semantics](./phase-f-1/stage-f1-02-sidebar-navigation-state-alignment/stage-f1-02-slice-01-sidebar-navigation-data-extraction-and-active-link-semantics.md)
- [x] [Slice-02: Collapsed Mode Interaction and Keyboard Navigation Hardening](./phase-f-1/stage-f1-02-sidebar-navigation-state-alignment/stage-f1-02-slice-02-collapsed-mode-interaction-and-keyboard-navigation-hardening.md)

#### Phase-f-1 Stage-f1-03

- [-] [Stage-f1-03 Overview](./phase-f-1/stage-f1-03-admin-surface-cohesion/stage-f1-03-admin-surface-cohesion.md)
- [x] [Slice-01: Admin Surface Primitive Extraction and Entities/Inbox Adoption](./phase-f-1/stage-f1-03-admin-surface-cohesion/stage-f1-03-slice-01-admin-surface-primitive-extraction-and-entities-inbox-adoption.md)
- [ ] [Slice-02: Proposal Review Surface Alignment and Regression Pass](./phase-f-1/stage-f1-03-admin-surface-cohesion/stage-f1-03-slice-02-proposal-review-surface-alignment-and-regression-pass.md)

## Update Rules

- Update this tracker when a slice starts, completes, or becomes blocked.
- Do not mark a stage complete until all of its slices are complete.
- Do not mark a phase complete until all of its stages are complete.
- Use the linked stage and slice documents as the execution source, not this tracker.
- Status in this tracker must match the status header in the linked document.
- The frontend tracker is independent of `master-plan-tracker.md`; do not cross-post entries.
