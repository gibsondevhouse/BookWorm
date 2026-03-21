import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test, { describe } from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = dirname(testDirectory);

const partDocPath = join(
  repositoryRoot,
  "docs/build-plans/phase-5/stage-04-ux-accessibility-and-feedback-integration/part-03-feedback-integration-and-phase-5-verification-gate/part-03-feedback-integration-and-phase-5-verification-gate.md"
);
const matrixPath = join(
  repositoryRoot,
  "docs/build-plans/phase-5/stage-04-ux-accessibility-and-feedback-integration/part-03-feedback-integration-and-phase-5-verification-gate/feedback-priority-and-phase-5-gate-matrix.md"
);
const checklistPath = join(
  repositoryRoot,
  "docs/build-plans/phase-5/stage-04-ux-accessibility-and-feedback-integration/part-03-feedback-integration-and-phase-5-verification-gate/acceptance-and-sign-off-checklist.md"
);
const reviewInboxPath = join(repositoryRoot, "apps/web/src/app/admin/review-inbox/ReviewInboxClient.tsx");
const proposalReviewPath = join(repositoryRoot, "apps/web/src/app/admin/review/[proposalId]/ProposalReviewClient.tsx");
const entitiesPath = join(repositoryRoot, "apps/web/src/app/admin/entities/EntitiesClient.tsx");
const editEntityPath = join(repositoryRoot, "apps/web/src/app/admin/entities/[slug]/edit/EditEntityPageClient.tsx");
const sharedStylePath = join(repositoryRoot, "apps/web/src/app/admin/adminAccessibility.module.css");

const validationCommands = [
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 ../../tests/phase5AccessibilityKeyboardNavigationPart01.test.ts",
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 ../../tests/phase5AdminUsabilityReadabilityPart02.test.ts",
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 ../../tests/phase4DeliveryPreferencesReviewInboxPart02.test.ts",
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 ../../tests/phase4ApproverAssignmentQueueViewsPart02.test.ts",
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 ../../tests/phase4PolicyDrivenApplicationGatesPart03.test.ts",
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 ../../tests/phase2AdminEntityCrudSlice.test.ts",
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 ../../tests/phase5SearchQueryExpansionRankingPart01.test.ts",
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 ../../tests/phase5SearchTypoToleranceAliasRecallPart02.test.ts",
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 ../../tests/phase2SearchApiSlice.test.ts",
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 ../../tests/phase5ContinuityRulePackExpansionPart01.test.ts",
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 ../../tests/phase5ContinuityDashboardTriagePart02.test.ts",
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 ../../tests/phase5ContinuitySignalQualitySuppressionPart03.test.ts",
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 ../../tests/phase2ContinuityIssueBaseline.test.ts",
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 ../../tests/phase5PortabilityZipFoundationPart01.test.ts",
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 ../../tests/phase5PortabilityConflictResolutionRollbackPart02.test.ts",
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 ../../tests/phase2PortabilityExportBaseline.test.ts",
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 ../../tests/phase2PortabilityImportJsonBaseline.test.ts",
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 ../../tests/phase2PortabilityImportMarkdownBaseline.test.ts",
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 --test-timeout=20000 ../../tests/phase4AuditRetentionPortabilityExtensionsPart02.test.ts",
  "pnpm lint",
  "pnpm type-check"
] as const;

const readSurface = async (path: string): Promise<string> => readFile(path, "utf8");

describe("Phase 5 Stage 04 Part 03: Feedback Integration and Phase 5 Verification Gate", () => {
  describe("AC-01: Feedback inputs are consolidated with explicit disposition rules", () => {
    test("priority matrix captures allowed sources, disposition rules, and defer guidance", async () => {
      const source = await readSurface(matrixPath);

      assert.match(source, /P0 \| Accessibility, release-safety, policy-safety, or editorial-throughput blocker/);
      assert.match(source, /P1 \| High-friction usability issue or confusing guidance/);
      assert.match(source, /P2 \| Useful quality-of-life improvement/);
      assert.match(source, /Carried-forward assistive-technology regression sign-off/);
      assert.match(source, /Carried-forward visual\/usability review/);
      assert.match(source, /Issue tracker bug reports/);
      assert.match(source, /Survey\/interview workflow friction notes/);
      assert.match(source, /Net-new feature requests or redesign asks/);
      assert.match(source, /Defer to v1 with rationale/);
    });
  });

  describe("AC-02: Approved fixes stay bounded to current P1 Stage 04 surfaces", () => {
    test("part doc scope excludes speculative architecture expansion", async () => {
      const source = await readSurface(partDocPath);

      assert.match(source, /implement only feedback items that fit the existing admin\/review architecture/);
      assert.match(source, /no speculative architecture expansion/);
      assert.match(source, /Review Inbox/);
      assert.match(source, /Proposal Review Dialog/);
      assert.match(source, /Admin Entity List/);
      assert.match(source, /Edit Entity Dialog/);
    });

    test("bounded feedback cues are implemented on the four P1 surfaces", async () => {
      const [inboxSource, proposalSource, entitiesSource, editSource, styleSource] = await Promise.all([
        readSurface(reviewInboxPath),
        readSurface(proposalReviewPath),
        readSurface(entitiesPath),
        readSurface(editEntityPath),
        readSurface(sharedStylePath)
      ]);

      assert.match(inboxSource, /Queue Summary/);
      assert.match(inboxSource, /Filter by title or status to reduce the queue/);
      assert.match(inboxSource, /Open Review/);
      assert.match(inboxSource, /Flag for Revision/);

      assert.match(proposalSource, /Decision Note/);
      assert.match(proposalSource, /decisionNote/);
      assert.match(proposalSource, /recordDecision/);

      assert.match(entitiesSource, /Working Set Summary/);
      assert.match(entitiesSource, /Current sort:/);
      assert.match(entitiesSource, /entity-controls-help/);
      assert.match(entitiesSource, /fieldHint/);

      assert.match(editSource, /Editing Guidance/);
      assert.match(editSource, /Entity details are ready to save/);
      assert.match(editSource, /Review the validation summary links if the form blocks save/);
      assert.match(editSource, /href=\{`#edit-entity-\$\{field\}`\}/);

      assert.match(styleSource, /\.summaryPanel \{/);
      assert.match(styleSource, /\.summaryTitle \{/);
      assert.match(styleSource, /\.helperText \{/);
      assert.match(styleSource, /\.successMessage \{/);
      assert.match(styleSource, /\.fieldHint \{/);
    });
  });

  describe("AC-03: Phase 5 verification gate lists the exact deterministic command inventory", () => {
    test("part doc and checklist both include the same 21-command gate", async () => {
      const [partSource, checklistSource] = await Promise.all([
        readSurface(partDocPath),
        readSurface(checklistPath)
      ]);

      assert.equal(validationCommands.length, 21);

      for (const command of validationCommands) {
        assert.match(partSource, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
        assert.match(checklistSource, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      }
    });
  });

  describe("AC-04 and AC-05: Manual verification and closeout remain explicit human-run inputs", () => {
    test("checklist keeps manual sign-off pending human-run and records closeout rules", async () => {
      const source = await readSurface(checklistPath);

      assert.match(source, /deferred risk pending product-owner rationale capture/);
      assert.match(source, /Visual\/usability review/);
      assert.match(source, /Assistive-technology regression sign-off/);
      assert.match(source, /reviewer name, date, pass\/block status, findings, disposition/);
      assert.match(source, /reviewer name, date, tool\/method used, pass\/block status, findings/);
      assert.match(source, /Stage 04 and Phase 5 may be marked complete when deterministic gates pass and any manual verification gaps are explicitly recorded as a closeout exception with deferred-risk disposition\./);
      assert.match(source, /Do not mark Phase 5 complete if manual verification gaps are left implicit or uncategorized\./);
      assert.match(source, /Blockers: None currently recorded; all deterministic gates passing/);
      assert.match(source, /Residual Risks: Deferred manual visual\/usability and assistive-technology verification may still surface regressions requiring a follow-up remediation slice/);
      assert.match(source, /Deferred Items: Manual visual\/usability and assistive-technology verification inputs on the four P1 surfaces are deferred-risk items pending product-owner rationale/);
    });

    test("all required implementation and verification artifacts exist", async () => {
      await access(partDocPath);
      await access(matrixPath);
      await access(checklistPath);
      await access(reviewInboxPath);
      await access(proposalReviewPath);
      await access(entitiesPath);
      await access(editEntityPath);
      await access(sharedStylePath);
    });
  });
});
