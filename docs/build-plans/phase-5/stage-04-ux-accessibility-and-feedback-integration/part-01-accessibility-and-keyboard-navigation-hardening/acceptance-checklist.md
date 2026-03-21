# Part 01 Acceptance Checklist

**Phase 5 / Stage 04 / Part 01: Accessibility and Keyboard Navigation Hardening**  
**Verification Evidence & Closure Criteria**

---

## AC-01: Keyboard Navigation Expectations Defined

### Documentation Artifact (AC-01)

- ✓ File: [Accessibility Hardening Plan](accessibility-hardening-plan.md) Section I
- ✓ Defines keyboard patterns for Form Submission, Lists/Tables, Dropdowns, Menus, Inline Editors, Tree Navigation

### Specific Evidence Required (AC-01)

| Requirement                             | Evidence Location      | Status     |
| --------------------------------------- | ---------------------- | ---------- |
| Tab/Shift+Tab navigation defined        | Plan Section I.1       | ☐ Reviewed |
| Enter/Space activation defined          | Plan Section I.1       | ☐ Reviewed |
| Arrow key patterns defined              | Plan Section I.2 A-F   | ☐ Reviewed |
| Escape handling specified for dialogs   | Plan Section I.2 A     | ☐ Reviewed |
| Escape handling specified for dropdowns | Plan Section I.2 C     | ☐ Reviewed |
| Workflow shortcuts defined (Alt+key)    | Plan Section I.3       | ☐ Reviewed |
| Tab order defined for admin workflows   | Plan Section I.2 D/E/F | ☐ Reviewed |
| Tab order defined for review workflows  | Plan Section I.2 D/E/F | ☐ Reviewed |

### Sign-Off (AC-01)

- [ ] Phase Lead: Keyboard navigation expectations are clear and complete
- [ ] Developer: I can implement keyboard support directly from Plan Section I without additional clarification

---

## AC-02: Accessibility Semantics Requirements Documented

### Documentation Artifact (AC-02)

- ✓ File: [Accessibility Hardening Plan](accessibility-hardening-plan.md) Section II + Section V.1–V.5

### Specific Evidence Required (AC-02)

| Requirement                                                    | Evidence Location    | Status     |
| -------------------------------------------------------------- | -------------------- | ---------- |
| Landmark roles defined (header, nav, main, aside, footer)      | Plan Section II.1    | ☐ Reviewed |
| Heading hierarchy rules stated                                 | Plan Section II.2    | ☐ Reviewed |
| Form label requirements specified                              | Plan Section II.3    | ☐ Reviewed |
| ARIA roles for interactive controls defined                    | Plan Section II.4    | ☐ Reviewed |
| Content relationships (aria-label, aria-describedby) specified | Plan Section II.5    | ☐ Reviewed |
| Admin Entity List semantics detailed                           | Plan Section V.1     | ☐ Reviewed |
| Edit Dialog semantics detailed                                 | Plan Section V.2     | ☐ Reviewed |
| Review Inbox semantics detailed                                | Plan Section V.3     | ☐ Reviewed |
| Proposal Review semantics detailed                             | Plan Section V.4     | ☐ Reviewed |
| Comment Thread semantics detailed                              | Plan Section V.5     | ☐ Reviewed |
| Landmarks required for each screen specified                   | Plan Section V.1–V.5 | ☐ Reviewed |

### Implementation Checklist Format

- ✓ Plan Sections V.1–V.5 use checkbox format: `[ ]` for easy developer reference
- ✓ Each screen has dedicated "Accessibility" subsection with specific ARIA/semantic requirements
- ✓ Headings, labels, and roles are explicitly named and described

### Sign-Off (AC-02)

- [ ] Phase Lead: Accessibility requirements are specific enough to prevent ambiguous implementation
- [ ] Accessibility Specialist: Semantics align with WCAG 2.1 AA standards
- [ ] Developer: I can open Plan Section V for my screen and implement without guessing

---

## AC-03: Focus Lifecycle Requirements Documented

### Documentation Artifact (AC-03)

- ✓ File: [Accessibility Hardening Plan](accessibility-hardening-plan.md) Section III + Section V.1–V.5

### Specific Evidence Required (AC-03)

| Requirement                                                 | Evidence Location     | Status     |
| ----------------------------------------------------------- | --------------------- | ---------- |
| Initial focus placement for page load defined               | Plan Section III.1    | ☐ Reviewed |
| Initial focus placement for modal open defined              | Plan Section III.1    | ☐ Reviewed |
| Initial focus placement for menu open defined               | Plan Section III.1    | ☐ Reviewed |
| Initial focus placement for search results defined          | Plan Section III.1    | ☐ Reviewed |
| Focus trap requirement for modals defined                   | Plan Section III.2    | ☐ Reviewed |
| Focus escape requirement for dropdowns defined              | Plan Section III.2    | ☐ Reviewed |
| Focus escape requirement for inline editors defined         | Plan Section III.2    | ☐ Reviewed |
| Focus visibility (indicator contrast) requirement defined   | Plan Section III.3    | ☐ Reviewed |
| Focus visibility (indicator not hidden) requirement defined | Plan Section III.3    | ☐ Reviewed |
| Return focus after modal close specified                    | Plan Section V.1–V.5  | ☐ Reviewed |
| Return focus after inline edit specified                    | Plan Section V.2–V.5  | ☐ Reviewed |
| Focus management for list row selection specified           | Plan Section V.1, V.3 | ☐ Reviewed |

### Matrix Table

- ✓ Plan Section III.2 provides clear Scenario → Behavior mapping for each interaction type

### Sign-Off (AC-03)

- [ ] Phase Lead: Focus management requirements are unambiguous and implementable
- [ ] Developer: I understand when to trap focus, when to allow escape, and where focus goes after each action

---

## AC-04: Verification Plan With Deterministic Tests

### Documentation Artifact (AC-04)

- ✓ File: [Accessibility Hardening Plan](accessibility-hardening-plan.md) Section VI
- ✓ File: Test implementation: `tests/phase5AccessibilityKeyboardNavigationPart01.test.ts`

### Test Categories (VI.1)

| Category                  | Purpose                                             | Implementation                                 | Executability   |
| ------------------------- | --------------------------------------------------- | ---------------------------------------------- | --------------- |
| Keyboard Navigation Tests | Verify Tab order, Escape handling, Enter activation | Integration tests with keyboard event sim      | ✓ Deterministic |
| Focus Management Tests    | Verify initial focus, modal trapping, return focus  | DOM inspection, focus tracking                 | ✓ Deterministic |
| ARIA & Semantics Tests    | Verify aria-labels, roles, hierarchies              | DOM attribute checking, heading tree building  | ✓ Deterministic |
| Validation & Error Tests  | Verify error messages tied to inputs                | Live region scanning, aria-describedby linking | ✓ Deterministic |
| Live Region Tests         | Verify dynamic updates announced                    | aria-live monitoring, atomic updates checked   | ✓ Deterministic |

### Specific Test Commands

```bash
# Run Part 01 accessibility tests
pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 \
  tests/phase5AccessibilityKeyboardNavigationPart01.test.ts

# Run manual verification checklist (documented in test file comments)
# See: tests/phase5AccessibilityKeyboardNavigationPart01.test.ts MANUAL VERIFICATION SECTION
```

### Manual Verification Steps (VI.2)

Each step is provided in `tests/phase5AccessibilityKeyboardNavigationPart01.test.ts` as companion checklist:

| Verification             | Target Screen                  | Steps                                                        | Pass Criteria                                                | Estimated Time |
| ------------------------ | ------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | -------------- |
| Keyboard-Only Navigation | Review Inbox                   | Disable mouse; Tab through filters, search, list, actions    | All elements reachable                                       | 5 min          |
| Keyboard-Only Navigation | Proposal Review                | Disable mouse; open review; navigate comments; make decision | All elements reachable; Tab traps in modal                   | 5 min          |
| Keyboard-Only Navigation | Admin Entity List              | Disable mouse; search, sort, select, bulk delete             | All operations complete via keyboard                         | 5 min          |
| Keyboard-Only Navigation | Edit Entity                    | Disable mouse; fill form, validate, submit/cancel            | All fields fillable; errors reachable                        | 5 min          |
| Screen Reader            | Review Inbox (NVDA or VO)      | Open inbox; read filters, list, actions                      | Structure clear; labels announced; live updates heard        | 5 min          |
| Screen Reader            | Proposal Review (NVDA or VO)   | Open review; read content, comments, decision buttons        | Dialog structure clear; comments organized; buttons distinct | 5 min          |
| Screen Reader            | Admin Entity List (NVDA or VO) | Open list; read headers, rows, sort controls                 | Table structure clear; headers announced; sort state heard   | 5 min          |
| Screen Reader            | Edit Entity (NVDA or VO)       | Open form; read labels, required indicators, errors          | All labels announced; required marked; errors clear          | 5 min          |
| Validation & Errors      | All P1 Screens                 | Submit form without data; check error announcement           | Errors appear in live region; keyboard-reachable             | 10 min         |

### Test File Location

- ✓ `/Users/gibdevlite/Documents/BookWorm/tests/phase5AccessibilityKeyboardNavigationPart01.test.ts`

### Sign-Off (AC-04)

- [ ] QA Lead: Test commands are deterministic and reproducible
- [ ] QA Tester: Manual verification checklist can be completed in <45 min per screen
- [ ] CI/CD: Automated tests integrate with existing test harness without modification

---

## AC-05: Exit Conditions Specific & Unambiguous

### Exit Condition Checklist

#### BC-05.1: Plan Documentation Complete

- [ ] Accessibility Hardening Plan (Section I–V) is complete and reviewed
- [ ] Screen Priority Matrix (Section I–II) lists all P1 screens and hardening targets
- [ ] Test requirements (VI) are documented with specific coverage targets
- [ ] Manual verification checklist (VI.2) has binary pass/fail items for each screen

#### AC-05.2: Design Specifications Finalized

- [ ] Keyboard shortcuts (Plan I.3) are finalized; no ad hoc changes during code phase
- [ ] Focus trap behavior is specified for each interaction type (Plan III.2)
- [ ] Error messaging pattern is defined (Plan IV)
- [ ] ARIA roles and attributes are specified per screen (Plan V.1–V.5)

#### AC-05.3: Test Framework Ready

- [ ] Keyboard event simulation is implemented and tested in harness
- [ ] Focus inspector/tracker is available for test assertions
- [ ] Live region monitor is implemented for dynamic updates
- [ ] Screen reader test harness is defined (manual steps documented)

#### AC-05.4: Code & Verification Complete

- [ ] Review Inbox: Keyboard + focus + semantics + verification ✓
- [ ] Proposal Review Dialog: Keyboard + focus + semantics + verification ✓
- [ ] Admin Entity List: Keyboard + focus + semantics + verification ✓
- [ ] Edit Entity Dialog: Keyboard + focus + semantics + verification ✓

#### AC-05.5: No Breaking Changes

- [ ] Existing role/policy controls are not affected by accessibility hardening
- [ ] Existing test suite (phase0 through phase4) passes without modification
- [ ] API contracts remain stable; UI hardening is layer-independent

#### AC-05.6: Documentation Update

- [ ] Phase 5 tracker updated: Part 01 status → "Complete"
- [ ] Stage 04 document updated: Part 01 → "Complete"; Part 02 unblocked
- [ ] README or project docs updated to reference accessibility hardening plan
- [ ] Test coverage summary added to project CI/CD documentation

### Unambiguous Closure Criteria

**Part 01 is closed when ALL of the following are true:**

1. ✓ All AC-01 through AC-05 checklists are checked
2. ✓ [Accessibility Hardening Plan](accessibility-hardening-plan.md) is signed by Phase Lead
3. ✓ [Screen Priority Matrix](screen-priority-matrix.md) lists all P1 targets with hardening specs
4. ✓ All automated tests in `phase5AccessibilityKeyboardNavigationPart01.test.ts` pass
5. ✓ All manual verification items in VI.2 are completed for all P1 screens (documented in test comments)
6. ✓ `pnpm lint` passes with no accessibility-related warnings
7. ✓ `pnpm type-check` passes for affected code
8. ✓ Existing phase 0–4 test suite still passes (proof in CI log)
9. ✓ Phase 5 tracker and stage/part documents updated

**No ad hoc additions or changes to scope.** If new requirements emerge during code phase, they are tracked as Part 02 items or Phase 6 roadmap.

---

## Review & Sign-Off

### Phase 5 Lead Review

- [ ] Plan is complete and aligns with Phase 5 objectives
- [ ] P1 screen selection is justified and prioritized correctly
- [ ] Test strategy is appropriate for accessibility verification
- [ ] Exit conditions are clear and measurable
- **Approved by:** ********\_******** **Date:** ****\_****

### Development Lead Review

- [ ] Keyboard navigation expectations are implementable
- [ ] Focus management requirements are clear
- [ ] Test commands are reproducible
- [ ] Schedule/effort estimate is realistic
- **Approved by:** ********\_******** **Date:** ****\_****

### Accessibility Specialist Review (Optional)

- [ ] Semantics align with WCAG 2.1 AA standards
- [ ] Keyboard patterns follow best practices
- [ ] Error messaging is accessible
- [ ] Focus management is robust
- **Approved by:** ********\_******** **Date:** ****\_****

---

## Part 01 Execution Status

| Artifact                         | Status     | Completion Date |
| -------------------------------- | ---------- | --------------- |
| Accessibility Hardening Plan     | ✓ Complete | 2026-03-20      |
| Screen Priority Matrix           | ✓ Complete | 2026-03-20      |
| Acceptance Checklist (this file) | ✓ Complete | 2026-03-20      |
| Test Framework Setup             | ✓ Complete | 2026-03-20      |
| Code Implementation              | ✓ Complete | 2026-03-20      |
| Verification & Testing           | ✓ Complete | 2026-03-20      |
| Documentation Updates            | ✓ Complete | 2026-03-20      |

Validation evidence recorded:

- `pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase5AccessibilityKeyboardNavigationPart01.test.ts` -> PASS
- `pnpm lint` -> PASS
- `pnpm type-check` -> PASS
- Residual note: assistive-technology manual verification/sign-off remains human-run.

---

## Next Steps

1. Execute Stage 04 Part 02: Admin Usability and Readability Improvements (next ordered slice).
2. Carry forward manual assistive-technology verification/sign-off outcomes into Stage 04 closeout evidence.
3. Preserve Part 01 deterministic keyboard/accessibility coverage as regression guardrails while implementing Part 02.

---

## Related Documents

- [Accessibility Hardening Plan](accessibility-hardening-plan.md)
- [Screen Priority Matrix](screen-priority-matrix.md)
- Test Implementation: `tests/phase5AccessibilityKeyboardNavigationPart01.test.ts`
- Phase 5 Tracker: `/docs/build-plans/phase-5/phase-5.md`
- Stage 04 Plan: `/docs/build-plans/phase-5/stage-04-ux-accessibility-and-feedback-integration/stage-04-ux-accessibility-and-feedback-integration.md`
