# Part 02: Active Release Public Read

## Objective

Expose a public read path for Character that resolves through the active release instead of directly through draft records.

## Work To Be Done

- create the public character read route or page
- resolve the character from active release composition
- ensure unreleased drafts are excluded
- define response behavior for missing or inactive release content
- verify that public reads stay within public-safe visibility

## Deliverables

- public character read path
- active-release resolution behavior
- negative-case behavior for unreleased content

## Dependencies

- Part 01 complete
- release composition path working from Stage 03

## Completion Check

- public output changes only when the active release changes
- direct draft edits do not appear publicly until released
