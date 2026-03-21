import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test, { describe } from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = dirname(testDirectory);

const stageDocPath = join(
  repositoryRoot,
  "docs/build-plans/phase-6/stage-01-phase-5-closeout-unblock-surfaces/stage-01-phase-5-closeout-unblock-surfaces.md"
);
const executionPackPath = join(
  repositoryRoot,
  "docs/build-plans/phase-6/stage-01-phase-5-closeout-unblock-surfaces/stage-01-slice-01-verification-execution-pack.md"
);
const checklistTemplatePath = join(
  repositoryRoot,
  "docs/build-plans/phase-6/stage-01-phase-5-closeout-unblock-surfaces/stage-01-unblock-checklist-template.md"
);
const handoffTemplatePath = join(
  repositoryRoot,
  "docs/build-plans/phase-6/stage-01-phase-5-closeout-unblock-surfaces/stage-01-findings-and-stage-02-handoff-template.md"
);

const readDocument = async (path: string): Promise<string> => readFile(path, "utf8");

describe("Phase 6 Stage 01 Slice 01: Verification execution pack", () => {
  test("stage plan references all Slice 01 execution-pack artifacts", async () => {
    const source = await readDocument(stageDocPath);

    assert.match(source, /Slice 01 Execution Pack Artifacts/);
    assert.match(source, /stage-01-slice-01-verification-execution-pack\.md/);
    assert.match(source, /stage-01-unblock-checklist-template\.md/);
    assert.match(source, /stage-01-findings-and-stage-02-handoff-template\.md/);
  });

  test("execution pack codifies reviewer roles, schema fields, and ordered P1 sequence", async () => {
    const source = await readDocument(executionPackPath);

    assert.match(source, /R-UX-01/);
    assert.match(source, /R-A11Y-01/);
    assert.match(source, /R-QA-01/);
    assert.match(source, /R-PL-01/);

    assert.match(source, /1\. Review Inbox/);
    assert.match(source, /2\. Proposal Review Dialog/);
    assert.match(source, /3\. Admin Entity List/);
    assert.match(source, /4\. Edit Entity Dialog/);

    assert.match(source, /`surfaceId`/);
    assert.match(source, /`runType`/);
    assert.match(source, /`reviewerName`/);
    assert.match(source, /`reviewDate`/);
    assert.match(source, /`method`/);
    assert.match(source, /`passBlockStatus`/);
    assert.match(source, /`findingsSummary`/);
    assert.match(source, /`artifactLinks`/);
    assert.match(source, /`disposition`/);
    assert.match(source, /`dispositionOwner`/);
    assert.match(source, /`targetSlice`/);
    assert.match(source, /`dueDate`/);

    assert.match(source, /pass/);
    assert.match(source, /fix-now/);
    assert.match(source, /defer-with-owner/);

    assert.match(source, /must preserve deferred-risk rationale/);
  });

  test("templates enforce evidence completion and Stage 02 handoff fields", async () => {
    const [checklistSource, handoffSource] = await Promise.all([
      readDocument(checklistTemplatePath),
      readDocument(handoffTemplatePath)
    ]);

    assert.match(checklistSource, /8 rows total/);
    assert.match(checklistSource, /Owner \(if not pass\)/);
    assert.match(checklistSource, /Target Slice \(if not pass\)/);
    assert.match(checklistSource, /Due Date \(if not pass\)/);
    assert.match(checklistSource, /rows marked `block` must not be recorded as disposition `pass`/);
    assert.match(checklistSource, /deferred-risk rationale/);

    assert.match(handoffSource, /Stage 02 Handoff Summary/);
    assert.match(handoffSource, /fixNowItems/);
    assert.match(handoffSource, /deferredItems/);
    assert.match(handoffSource, /stage02DecisionInputs/);
    assert.match(handoffSource, /do not change Phase 5 closeout exception language/);
  });

  test("all execution-pack artifacts exist", async () => {
    await access(stageDocPath);
    await access(executionPackPath);
    await access(checklistTemplatePath);
    await access(handoffTemplatePath);
  });
});
