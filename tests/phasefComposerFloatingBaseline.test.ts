import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test, { describe } from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = dirname(testDirectory);

const pagePath = join(repositoryRoot, "apps/web/src/app/page.tsx");
const composerPath = join(
  repositoryRoot,
  "apps/web/src/features/chat-surface/composer/components/Composer.tsx",
);
const textareaPath = join(
  repositoryRoot,
  "apps/web/src/features/chat-surface/composer/components/AutoResizeTextarea.tsx",
);
const hookPath = join(
  repositoryRoot,
  "apps/web/src/features/chat-surface/composer/hooks/useComposerState.ts",
);

const readSource = async (path: string): Promise<string> => readFile(path, "utf8");

describe("Phase F Composer Floating Baseline", () => {
  describe("AC-01: Integration Surface", () => {
    test("page integrates floating composer and keeps message-list bottom space", async () => {
      const source = await readSource(pagePath);

      assert.match(source, /import \{ Composer \} from "\.\.\/features\/chat-surface\/composer\/components\/Composer"/);
      assert.match(source, /className="m-0 flex flex-1 list-none flex-col gap-4 overflow-y-auto px-4 py-5 pb-52/);
      assert.match(source, /<Composer/);
    });
  });

  describe("AC-02: Floating Container and Utilities", () => {
    test("composer renders free-floating shell with compact utility controls", async () => {
      const source = await readSource(composerPath);

      assert.match(source, /className="pointer-events-none absolute inset-x-0 bottom-4 z-20/);
      assert.match(source, /rounded-\[1\.75rem\]/);
      assert.match(source, /backdrop-blur-xl/);
      assert.match(source, /shadow-\[0_24px_60px_rgba\(0,0,0,0\.44\)/);

      assert.match(source, /aria-label="Upload files"/);
      assert.match(source, /aria-label=\{composer\.isDictating \? "Stop dictation" : "Start dictation"\}/);
      assert.match(source, /aria-label="Configure connectors"/);
      assert.match(source, /aria-label="Send message"/);
      assert.match(source, /role="dialog"/);
      assert.match(source, /aria-label="Connector selector"/);
    });
  });

  describe("AC-03: Hook-driven State Separation", () => {
    test("composer uses useComposerState and hook owns multimodal state", async () => {
      const composerSource = await readSource(composerPath);
      const hookSource = await readSource(hookPath);

      assert.match(composerSource, /const composer = useComposerState\(props\);/);

      assert.match(hookSource, /const \[text, setText\] = useState\(""\);/);
      assert.match(hookSource, /const \[attachments, setAttachments\] = useState<Attachment\[]>\(\[\]\);/);
      assert.match(hookSource, /const \[connectors, setConnectors\] = useState<Connector\[]>\(initialConnectors\);/);
      assert.match(hookSource, /const \[currentModeId, setCurrentModeId\] = useState\(initialModes\[0\]\?\.id \?\? "drafting"\);/);
      assert.match(hookSource, /const \[isDictating, setIsDictating\] = useState\(false\);/);
      assert.match(hookSource, /const \[transcript, setTranscript\] = useState\(""\);/);
    });
  });

  describe("AC-04: Textarea Input Behavior", () => {
    test("auto-resize textarea keeps send/newline keyboard semantics", async () => {
      const source = await readSource(textareaPath);

      assert.match(source, /if \(event\.key !== "Enter" \|\| event\.shiftKey\) \{/);
      assert.match(source, /event\.preventDefault\(\);/);
      assert.match(source, /onSubmit\(\);/);
      assert.match(source, /resize-none/);
      assert.match(source, /border-transparent/);
      assert.match(source, /focus:ring-0/);
    });
  });

  describe("AC-05: Files Exist", () => {
    test("composer baseline files exist", async () => {
      await access(pagePath);
      await access(composerPath);
      await access(textareaPath);
      await access(hookPath);
    });
  });
});
