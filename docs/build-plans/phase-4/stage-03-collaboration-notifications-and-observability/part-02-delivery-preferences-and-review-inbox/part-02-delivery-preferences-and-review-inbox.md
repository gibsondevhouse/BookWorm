# Part 02: Delivery Preferences and Review Inbox

## Objective

Give users control over collaboration alerts and provide an actionable review inbox shaped by assignment and policy state.

## Work To Be Done

- add user notification preference storage by event category
- implement preference-aware filtering in notification delivery read paths
- add reviewer inbox endpoint for open assignments and pending decisions
- support inbox filters (state, priority, overdue, delegated, escalated)
- ensure inbox routes enforce role visibility and deterministic ordering

## Deliverables

- notification preference model and update APIs
- reviewer inbox retrieval endpoints and filter contracts
- tests for preference enforcement, inbox visibility, and filter combinations

## Dependencies

- Part 01 notification event outbox complete
- assignment and escalation metadata available from Stages 01 and 02
- user identity context already present in authenticated routes

## Completion Check

- users can read and update delivery preferences for supported categories
- reviewer inbox returns relevant actionable items and hides unauthorized records
- inbox filtering works deterministically across pagination boundaries
- preference settings influence delivered/readable notification output

## Status

Status: **COMPLETE** [x]

## Implementation Evidence

**Validated:** 21/21 tests passing — `tests/phase4DeliveryPreferencesReviewInboxPart02.test.ts`

### Migration
- `20260320185457_add_notification_preferences` — `NotificationPreference` model added to Prisma schema

### Repositories
- Added: `notificationPreferenceRepository.ts`
- Added: `reviewInboxRepository.ts`
- Updated: `notificationEventRepository.ts` — added `listForUser`

### Services
- Added: `notificationPreferenceService.ts`
- Added: `reviewInboxService.ts`
- Updated: `notificationEventService.ts` — added `listNotificationEventsForUser`

### Routers
- Added: `notificationPreferenceRouter.ts` — `GET /notification-preferences`, `PUT /notification-preferences/:category`
- Added: `reviewInboxRouter.ts` — `GET /review-inbox`
- Updated: `notificationEventRouter.ts` — added `GET /notification-events/my`
- Updated: `createApp.ts` — wired new routers
