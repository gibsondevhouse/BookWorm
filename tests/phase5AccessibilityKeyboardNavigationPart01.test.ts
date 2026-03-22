import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test, { describe } from "node:test";
import { fileURLToPath } from "node:url";

import {
  moveFocusTrap,
  moveListCursor,
  resolveKeyboardShortcut,
  validateEntityForm
} from "../apps/web/src/app/admin/_lib/accessibilityKeyboard.js";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = dirname(testDirectory);

const reviewInboxPath = join(repositoryRoot, "apps/web/src/app/admin/review-inbox/ReviewInboxClient.tsx");
const proposalReviewPath = join(repositoryRoot, "apps/web/src/app/admin/review/[proposalId]/ProposalReviewClient.tsx");
const entitiesPath = join(repositoryRoot, "apps/web/src/app/admin/entities/EntitiesClient.tsx");
const editEntityPath = join(repositoryRoot, "apps/web/src/app/admin/entities/[slug]/edit/EditEntityPageClient.tsx");
const sharedStylePath = join(repositoryRoot, "apps/web/src/app/admin/adminAccessibility.module.css");
const globalStylePath = join(repositoryRoot, "apps/web/src/app/globals.css");
const accessibilityTokensPath = join(repositoryRoot, "apps/web/src/app/accessibility-tokens.css");

const readSurface = async (path: string): Promise<string> => readFile(path, "utf8");

describe("Phase 5 Stage 04 Part 01: Accessibility & Keyboard Navigation", () => {
  describe("AC-01: Keyboard Navigation Expectations", () => {
    test("keyboard shortcut resolver maps all P1 commands", () => {
      assert.equal(resolveKeyboardShortcut({ altKey: true, key: "I" }), "focus-inbox");
      assert.equal(resolveKeyboardShortcut({ altKey: true, key: "A" }), "approve");
      assert.equal(resolveKeyboardShortcut({ altKey: true, key: "D" }), "deny");
      assert.equal(resolveKeyboardShortcut({ altKey: true, key: "E" }), "escalate");
      assert.equal(resolveKeyboardShortcut({ altKey: true, key: "N" }), "new-entity");
      assert.equal(resolveKeyboardShortcut({ altKey: true, key: "S" }), "save");
      assert.equal(resolveKeyboardShortcut({ altKey: true, key: "C" }), "cancel");
      assert.equal(resolveKeyboardShortcut({ altKey: true, key: "R" }), "refresh");
      assert.equal(resolveKeyboardShortcut({ altKey: false, key: "A" }), null);
    });

    test("list cursor navigation supports arrows and Home/End", () => {
      assert.equal(moveListCursor(0, 3, "ArrowDown"), 1);
      assert.equal(moveListCursor(2, 3, "ArrowDown"), 0);
      assert.equal(moveListCursor(0, 3, "ArrowUp"), 2);
      assert.equal(moveListCursor(1, 3, "Home"), 0);
      assert.equal(moveListCursor(1, 3, "End"), 2);
      assert.equal(moveListCursor(0, 0, "ArrowDown"), -1);
    });

    test("focus trap navigation wraps in both directions", () => {
      assert.equal(moveFocusTrap(0, 4, false), 1);
      assert.equal(moveFocusTrap(3, 4, false), 0);
      assert.equal(moveFocusTrap(0, 4, true), 3);
      assert.equal(moveFocusTrap(2, 4, true), 1);
    });
  });

  describe("AC-02: Accessibility Semantics Requirements", () => {
    test("review inbox includes labeled filters, listbox semantics, and dialog semantics", async () => {
      const source = await readSurface(reviewInboxPath);

      assert.match(source, /<main/);
      assert.match(source, /<header/);
      assert.match(source, /htmlFor="review-search"/);
      assert.match(source, /role="listbox"/);
      assert.match(source, /role="option"/);
      assert.match(source, /aria-live="polite"/);
      assert.match(source, /role="dialog"/);
      assert.match(source, /aria-modal="true"/);
      assert.match(source, /<ol aria-label="Proposal comments">/);
      assert.match(source, /<fieldset className=\{styles\.decisionFieldset\}>/);
    });

    test("proposal review route preserves semantic structure and decision grouping", async () => {
      const source = await readSurface(proposalReviewPath);

      assert.match(source, /role="dialog"/);
      assert.match(source, /aria-labelledby="proposal-review-title"/);
      assert.match(source, /<h2 id="proposal-review-title">/);
      assert.match(source, /<h3 id="proposal-content-title">/);
      assert.match(source, /<ol>/);
      assert.match(source, /<fieldset className=\{styles\.decisionFieldset\}>/);
    });

    test("entity list route includes semantic table headers, selectable rows, and form labels", async () => {
      const source = await readSurface(entitiesPath);

      assert.match(source, /<table className=\{styles\.table\}>/);
      assert.match(source, /<thead>/);
      assert.match(source, /<tbody onKeyDown=\{onTableKeyDown\}>/);
      assert.match(source, /scope="col"/);
      assert.match(source, /aria-sort=\{toAriaSort\(sortDirection\)\}/);
      assert.match(source, /aria-label="Select all entities"/);
      assert.match(source, /aria-label=\{`Select \$\{entity\.name\}`\}/);
      assert.match(source, /htmlFor="entity-name"/);
      assert.match(source, /required/);
      assert.match(source, /aria-required="true"/);
      assert.match(source, /aria-live="assertive"/);
    });

    test("edit entity route includes explicit labels and field-level error associations", async () => {
      const source = await readSurface(editEntityPath);

      assert.match(source, /htmlFor="edit-entity-name"/);
      assert.match(source, /aria-describedby=\{errors\.name \? "edit-entity-name-error" : undefined\}/);
      assert.match(source, /htmlFor="edit-entity-summary"/);
      assert.match(source, /htmlFor="edit-entity-category"/);
      assert.match(source, /role="alert"/);
      assert.match(source, /aria-live="assertive"/);
      assert.match(source, /\* indicates required field/);
    });
  });

  describe("AC-03: Focus Lifecycle Requirements", () => {
    test("focus trap implementation exists on both modal surfaces", async () => {
      const reviewSource = await readSurface(reviewInboxPath);
      const entitiesSource = await readSurface(entitiesPath);

      assert.match(reviewSource, /if \(event\.key !== "Tab"\)/);
      assert.match(reviewSource, /moveFocusTrap\(/);
      assert.match(reviewSource, /focusableElements\[0\]\?\.focus\(\)/);
      assert.match(reviewSource, /if \(event\.key === "Escape"\)/);

      assert.match(entitiesSource, /if \(event\.key !== "Tab"\)/);
      assert.match(entitiesSource, /moveFocusTrap\(/);
      assert.match(entitiesSource, /focusable\[0\]\?\.focus\(\)/);
      assert.match(entitiesSource, /triggerRef\.current\?\.focus\(\)/);
    });

    test("global focus indicator style is present for keyboard users", async () => {
      const globalSource = await readSurface(globalStylePath);
      const tokenSource = await readSurface(accessibilityTokensPath);

      // Verify accessibility tokens define focus properties
      assert.match(tokenSource, /--focus-outline-width:\s*2px/);
      assert.match(tokenSource, /--focus-outline-color:\s*rgba\(134,\s*201,\s*255,\s*0\.95\)/);
      assert.match(tokenSource, /--focus-outline-offset:\s*2px/);
      assert.match(tokenSource, /--focus-outline-glow/);

      // Verify globals.css references the token variables for focus styling
      assert.match(globalSource, /outline:\s*var\(--focus-outline-width\)/);
      assert.match(globalSource, /solid var\(--focus-outline-color\)/);
      assert.match(globalSource, /outline-offset:\s*var\(--focus-outline-offset\)/);
      assert.match(globalSource, /box-shadow:\s*var\(--focus-outline-glow\)/);
    });
  });

  describe("AC-04: Verification Plan & Deterministic Automated Coverage", () => {
    test("entity form validation returns deterministic field-level errors", () => {
      const invalidResult = validateEntityForm({ name: "", summary: "", category: "" });

      assert.equal(invalidResult.isValid, false);
      assert.deepEqual(invalidResult.orderedErrorFields, ["name", "summary", "category"]);
      assert.equal(invalidResult.errors.name, "Name is required.");
      assert.equal(invalidResult.errors.summary, "Summary is required.");
      assert.equal(invalidResult.errors.category, "Category is required.");

      const validResult = validateEntityForm({
        name: "Ariadne Vale",
        summary: "Editorially validated profile.",
        category: "character"
      });

      assert.equal(validResult.isValid, true);
      assert.deepEqual(validResult.orderedErrorFields, []);
      assert.deepEqual(validResult.errors, {});
    });
  });

  describe("AC-05: Exit Conditions", () => {
    test("all P1 accessibility surface files exist and are executable inputs", async () => {
      await access(reviewInboxPath);
      await access(proposalReviewPath);
      await access(entitiesPath);
      await access(editEntityPath);
      await access(sharedStylePath);
    });
  });
});
