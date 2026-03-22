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

- [ ] [Phase-f-0 Overview](./phase-f-0/phase-f-0.md)

#### Phase-f-0 Stage-f0-01

- [x] [Stage-f0-01 Overview](./phase-f-0/stage-f0-01-composer-interaction-baseline/stage-f0-01-composer-interaction-baseline.md)
- [x] [Slice-01: Composer Interaction and Typography Baseline](./phase-f-0/stage-f0-01-composer-interaction-baseline/stage-f0-01-slice-01-composer-interaction-and-typography-baseline.md)

#### Phase-f-0 Stage-f0-02

- [x] [Stage-f0-02 Overview](./phase-f-0/stage-f0-02-chat-surface-and-markdown-output/stage-f0-02-chat-surface-and-markdown-output.md)
- [x] [Slice-01: Chat Message State, User/Assistant Layout, and Markdown Output](./phase-f-0/stage-f0-02-chat-surface-and-markdown-output/stage-f0-02-slice-01-chat-message-state-and-markdown-output.md)

#### Phase-f-0 Stage-f0-03

- [ ] [Stage-f0-03 Overview](./phase-f-0/stage-f0-03-root-shell-behavioral-polish/stage-f0-03-root-shell-behavioral-polish.md)

## Update Rules

- Update this tracker when a slice starts, completes, or becomes blocked.
- Do not mark a stage complete until all of its slices are complete.
- Do not mark a phase complete until all of its stages are complete.
- Use the linked stage and slice documents as the execution source, not this tracker.
- Status in this tracker must match the status header in the linked document.
- The frontend tracker is independent of `master-plan-tracker.md`; do not cross-post entries.
