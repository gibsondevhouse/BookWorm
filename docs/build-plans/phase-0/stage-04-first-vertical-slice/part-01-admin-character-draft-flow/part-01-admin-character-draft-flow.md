# Part 01: Admin Character Draft Flow

## Objective

Create the first authenticated authoring flow for one representative entity type: Character.

## Work To Be Done

- create the admin route or endpoint for character draft creation
- create validation for the initial character payload
- create revision creation on save
- create role checks to restrict draft write access appropriately
- provide a minimal admin-facing way to verify draft creation success

## Deliverables

- admin draft write path for Character
- validation behavior for required fields
- revision-on-save behavior

## Dependencies

- Stage 02 complete
- Stage 03 complete enough to persist characters and revisions

## Completion Check

- an authorized user can create or update a character draft
- saving produces a distinct revision record
