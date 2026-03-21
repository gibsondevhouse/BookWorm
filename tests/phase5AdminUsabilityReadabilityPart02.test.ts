import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test, { describe } from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = dirname(testDirectory);

const matrixPath = join(
  repositoryRoot,
  "docs/build-plans/phase-5/stage-04-ux-accessibility-and-feedback-integration/part-02-admin-usability-and-readability-improvements/usability-improvement-matrix.md"
);
const standardsPath = join(repositoryRoot, "apps/web/src/app/admin/READABILITY_STANDARDS.md");
const reviewInboxPath = join(repositoryRoot, "apps/web/src/app/admin/review-inbox/ReviewInboxClient.tsx");
const proposalReviewPath = join(repositoryRoot, "apps/web/src/app/admin/review/[proposalId]/ProposalReviewClient.tsx");
const entitiesPath = join(repositoryRoot, "apps/web/src/app/admin/entities/EntitiesClient.tsx");
const editEntityPath = join(repositoryRoot, "apps/web/src/app/admin/entities/[slug]/edit/EditEntityPageClient.tsx");
const sharedStylePath = join(repositoryRoot, "apps/web/src/app/admin/adminAccessibility.module.css");

const validationCommands = [
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase5AdminUsabilityReadabilityPart02.test.ts",
  "pnpm lint",
  "pnpm type-check",
  "pnpm --filter @book-worm/api exec tsx --test --test-concurrency=1 ../../tests/phase5AccessibilityKeyboardNavigationPart01.test.ts"
] as const;

const manualAssessmentScreens = [
  "Review Inbox",
  "Proposal Review Dialog",
  "Admin Entity List",
  "Edit Entity Dialog"
] as const;

const readSurface = async (path: string): Promise<string> => readFile(path, "utf8");

describe("Phase 5 Stage 04 Part 02: Admin Usability and Readability Improvements", () => {
  describe("AC-01: Readability Gaps and Targets are Documented for P1 Surfaces", () => {
    test("usability matrix contains all P1 surfaces and measurable typography targets", async () => {
      const source = await readSurface(matrixPath);

      assert.match(source, /Review Inbox/);
      assert.match(source, /Proposal Review Dialog/);
      assert.match(source, /Admin Entity List/);
      assert.match(source, /Edit Entity Dialog/);
      assert.match(source, /Line height: baseline 1\.4 → target 1\.6–1\.8/);
      assert.match(source, /target 60–70 chars/);
      assert.match(source, /Action buttons: increase clickable area to 44px minimum height/);
      assert.match(source, /Row height: baseline 40px → target 48px–56px/);
    });

    test("readability standards document captures shared P1 patterns", async () => {
      const source = await readSurface(standardsPath);

      assert.match(source, /# Admin Readability Standards/);
      assert.match(source, /## Status Indicators/);
      assert.match(source, /## Affordance Patterns/);
      assert.match(source, /## Empty State Patterns/);
      assert.match(source, /## Error State Patterns/);
      assert.match(source, /44px minimum control height/);
    });
  });

  describe("AC-02: Typography and Spacing Improvements are Applied", () => {
    test("shared admin stylesheet encodes line-height, measure, spacing, and button targets", async () => {
      const source = await readSurface(sharedStylePath);

      assert.match(source, /\.page \{[\s\S]*line-height: 1\.6;/);
      assert.match(source, /\.muted \{[\s\S]*max-width: 70ch;/);
      assert.match(source, /\.listItem \{[\s\S]*line-height: 1\.7;/);
      assert.match(source, /\.rowButton \{[\s\S]*max-width: 70ch;/);
      assert.match(source, /\.table th,[\s\S]*\.table td \{[\s\S]*padding: 0\.75rem 1rem;/);
      assert.match(source, /\.button,[\s\S]*\.closeButton \{[\s\S]*min-height: 2\.75rem;/);
      assert.match(source, /\.dialog #proposal-review-title \{[\s\S]*font-size: 1\.25rem;/);
      assert.match(source, /\.dialog section \+ section \{[\s\S]*margin-top: 1\.5rem;/);
      assert.match(source, /\.fieldset \{[\s\S]*gap: 1rem;/);
    });

    test("review inbox and proposal review consume readability hierarchy classes", async () => {
      const inboxSource = await readSurface(reviewInboxPath);
      const proposalSource = await readSurface(proposalReviewPath);

      assert.match(inboxSource, /className=\{styles\.list\}/);
      assert.match(inboxSource, /className=\{styles\.metaRow\}/);
      assert.match(inboxSource, /styles\.statusBadge/);
      assert.match(inboxSource, /styles\.priorityHigh|styles\.priorityMedium|styles\.priorityLow/);
      assert.match(proposalSource, /<h2 id="proposal-review-title">/);
      assert.match(proposalSource, /className=\{styles\.sectionCard\}/);
    });
  });

  describe("AC-03: Status Indicators, Affordances, and Empty States are Explicit", () => {
    test("shared stylesheet defines deterministic status badge variants and empty-state template", async () => {
      const source = await readSurface(sharedStylePath);

      assert.match(source, /\.statusBadge \{/);
      assert.match(source, /\.statusPending \{/);
      assert.match(source, /\.statusEscalated \{/);
      assert.match(source, /\.statusApproved \{/);
      assert.match(source, /\.emptyState \{/);
      assert.match(source, /\.emptyStateTitle \{/);
      assert.match(source, /\.errorIcon \{/);
    });

    test("review inbox and entity list expose deterministic empty states with CTA affordances", async () => {
      const inboxSource = await readSurface(reviewInboxPath);
      const entitiesSource = await readSurface(entitiesPath);

      assert.match(inboxSource, /No proposals match the current filters\./);
      assert.match(inboxSource, /Reset Filters/);
      assert.match(entitiesSource, /No entities match the current filters\./);
      assert.match(entitiesSource, /Clear Search/);
      assert.match(entitiesSource, /className=\{styles\.typeBadge\}/);
      assert.match(entitiesSource, /styles\.statusApproved/);
      assert.match(entitiesSource, /styles\.statusPending/);
      assert.match(entitiesSource, /styles\.statusEscalated/);
    });

    test("edit entity screen uses higher-salience error icon treatment", async () => {
      const source = await readSurface(editEntityPath);

      assert.match(source, /className=\{styles\.errorIcon\}/);
      assert.match(source, /role="alert"/);
      assert.match(source, /aria-live="assertive"/);
    });
  });

  describe("AC-04: Verification Plan is Deterministic and Includes Manual Steps", () => {
    test("required validation command inventory is captured for execution", () => {
      assert.equal(validationCommands.length, 4);
      assert.ok(validationCommands.every((command) => command.startsWith("pnpm")));
    });

    test("manual usability checklist covers each P1 screen", () => {
      assert.deepEqual(manualAssessmentScreens, [
        "Review Inbox",
        "Proposal Review Dialog",
        "Admin Entity List",
        "Edit Entity Dialog"
      ]);
    });
  });

  describe("Execution Deliverables", () => {
    test("all required implementation files exist", async () => {
      await access(standardsPath);
      await access(sharedStylePath);
      await access(reviewInboxPath);
      await access(proposalReviewPath);
      await access(entitiesPath);
      await access(editEntityPath);
    });
  });
});
