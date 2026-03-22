import { useEffect, useId, useRef, useState } from "react";

import { AutoResizeTextarea } from "./AutoResizeTextarea";
import { useComposerState } from "../hooks/useComposerState";
import type { ComposerProps } from "../types/ComposerProps";

export function Composer(props: ComposerProps) {
  const {
    disabled = false,
    placeholder = "Ask your AI for the next clue, draft, or revision pass",
    allowedFileTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "text/markdown",
      "application/json",
    ],
  } = props;

  const fileInputId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const connectorButtonRef = useRef<HTMLButtonElement>(null);
  const connectorPanelRef = useRef<HTMLDivElement>(null);
  const connectorCloseButtonRef = useRef<HTMLButtonElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnectorPopoverOpen, setIsConnectorPopoverOpen] = useState(false);
  const composer = useComposerState(props);

  useEffect(() => {
    if (!isConnectorPopoverOpen) {
      return;
    }

    const panel = connectorPanelRef.current;
    if (!panel) {
      return;
    }

    const focusableElements = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button, input[type="checkbox"], [href], [tabindex]:not([tabindex="-1"])',
      ),
    );

    focusableElements[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsConnectorPopoverOpen(false);
        connectorButtonRef.current?.focus();
        return;
      }

      if (event.key !== "Tab" || focusableElements.length === 0) {
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (
        panel.contains(target) ||
        connectorButtonRef.current?.contains(target)
      ) {
        return;
      }

      setIsConnectorPopoverOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isConnectorPopoverOpen]);

  const submit = async (): Promise<void> => {
    if (isSubmitting || disabled) {
      return;
    }

    setIsSubmitting(true);
    const didSubmit = await composer.submit();
    if (didSubmit) {
      textareaRef.current?.focus();
    }
    setIsSubmitting(false);
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const files = event.target.files;
    if (!files) {
      return;
    }

    composer.stageFiles(Array.from(files));
    event.target.value = "";
  };

  const enabledConnectorCount = composer.connectors.filter((connector) => connector.enabled).length;
  const popoverId = "composer-connectors-popover";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-3 sm:bottom-6 sm:px-6">
      <div className="pointer-events-auto w-full max-w-4xl rounded-[1.75rem] border border-[rgba(164,193,229,0.24)] bg-[linear-gradient(180deg,rgba(9,19,30,0.85)_0%,rgba(6,14,25,0.92)_100%)] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.44),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-4">
        {composer.stagedFiles.length > 0 ? (
          <ul className="mb-2 flex flex-wrap gap-2" aria-label="Staged attachments">
            {composer.stagedFiles.map((file) => (
              <li
                key={file.id}
                className="inline-flex items-center gap-1 rounded-full border border-[rgba(164,193,229,0.24)] bg-[rgba(8,16,27,0.75)] px-3 py-1 text-xs text-text"
              >
                <span className="max-w-40 truncate">{file.name}</span>
                <button
                  type="button"
                  className="rounded-full p-0.5 text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => composer.removeStagedFile(file.id)}
                  aria-label={`Remove ${file.name}`}
                >
                  <svg aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex items-end gap-2 sm:gap-3">
          <div className="relative flex shrink-0 items-center gap-1">
            <input
              id={fileInputId}
              ref={fileInputRef}
              type="file"
              className="sr-only"
              multiple
              accept={allowedFileTypes.join(",")}
              onChange={handleFileInput}
            />

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-text-muted transition-colors hover:border-[rgba(164,193,229,0.24)] hover:bg-[rgba(16,30,45,0.75)] hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isSubmitting}
              aria-label="Upload files"
            >
              <svg aria-hidden className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                />
              </svg>
            </button>

            <button
              type="button"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                composer.isDictating
                  ? "bg-[rgba(190,70,70,0.2)] text-[rgb(255,151,151)]"
                  : "text-text-muted hover:border-[rgba(164,193,229,0.24)] hover:bg-[rgba(16,30,45,0.75)] hover:text-text"
              }`}
              onClick={composer.toggleDictation}
              disabled={!composer.speechSupported || disabled || isSubmitting}
              aria-label={composer.isDictating ? "Stop dictation" : "Start dictation"}
              aria-pressed={composer.isDictating}
            >
              <span className="relative inline-flex items-center justify-center">
                {composer.isDictating ? (
                  <span className="absolute h-6 w-6 rounded-full bg-[rgba(255,120,120,0.25)] animate-ping" aria-hidden />
                ) : null}
                <svg aria-hidden className="relative h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zm5 9a5 5 0 11-10 0m5 5v4m-3 0h6"
                  />
                </svg>
              </span>
            </button>

            <div className="relative">
              <button
                ref={connectorButtonRef}
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-text-muted transition-colors hover:border-[rgba(164,193,229,0.24)] hover:bg-[rgba(16,30,45,0.75)] hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => setIsConnectorPopoverOpen((prev) => !prev)}
                disabled={disabled || isSubmitting}
                aria-label="Configure connectors"
                aria-expanded={isConnectorPopoverOpen}
                aria-controls={popoverId}
                aria-haspopup="dialog"
              >
                <svg aria-hidden className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h10M7 16h10M4 8h.01M4 12h.01M4 16h.01"
                  />
                </svg>
              </button>

              {enabledConnectorCount > 0 ? (
                <span className="pointer-events-none absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-[rgb(4,10,18)]">
                  {enabledConnectorCount}
                </span>
              ) : null}

              {isConnectorPopoverOpen ? (
                <div
                  id={popoverId}
                  ref={connectorPanelRef}
                  role="dialog"
                  aria-label="Connector selector"
                  className="absolute bottom-12 left-0 z-30 w-72 rounded-2xl border border-[rgba(164,193,229,0.22)] bg-[rgba(6,14,25,0.97)] p-3 shadow-2xl"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Connectors</p>
                    <button
                      ref={connectorCloseButtonRef}
                      type="button"
                      className="rounded-full p-1 text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() => {
                        setIsConnectorPopoverOpen(false);
                        connectorButtonRef.current?.focus();
                      }}
                      aria-label="Close connectors"
                    >
                      <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 6l12 12M18 6L6 18"
                        />
                      </svg>
                    </button>
                  </div>

                  <ul className="space-y-1.5">
                    {composer.connectors.map((connector) => (
                      <li key={connector.id}>
                        <label className="flex cursor-pointer items-start gap-2 rounded-xl px-2 py-1.5 hover:bg-[rgba(16,30,45,0.65)]">
                          <input
                            type="checkbox"
                            checked={connector.enabled}
                            onChange={() => composer.toggleConnector(connector.id)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="block text-sm text-text">{connector.label}</span>
                            <span className="block text-xs text-text-muted">{connector.description}</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative min-w-0 flex-1">
            <AutoResizeTextarea
              textareaRef={textareaRef}
              value={composer.textPayload}
              placeholder={placeholder}
              disabled={disabled || isSubmitting}
              onChange={composer.setTextPayload}
              onSubmit={submit}
            />

            <div className="pointer-events-none absolute bottom-2 right-2 left-2 flex items-center justify-between gap-2">
              <select
                className="pointer-events-auto h-8 max-w-36 rounded-full border border-[rgba(164,193,229,0.2)] bg-[rgba(6,14,25,0.88)] px-3 text-xs uppercase tracking-[0.12em] text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                value={composer.currentMode.id}
                onChange={(event) => composer.setMode(event.target.value)}
                aria-label="Chat mode"
                disabled={disabled || isSubmitting}
              >
                {composer.modes.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[rgb(4,10,18)] shadow-[0_8px_18px_rgba(134,201,255,0.3)] transition-transform hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-55"
                aria-label="Send message"
                onClick={submit}
                disabled={disabled || isSubmitting}
              >
                <svg aria-hidden className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 12h14M13 6l6 6-6 6"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {composer.attachmentError ? (
          <p className="mt-2 text-xs text-[rgb(235,120,120)]">{composer.attachmentError}</p>
        ) : null}

        {composer.dictationError ? (
          <p className="mt-1 text-xs text-[rgb(235,120,120)]">{composer.dictationError}</p>
        ) : null}

        {composer.transcriptBuffer ? (
          <p className="mt-1 text-xs text-text-muted" aria-live="polite">
            Dictation buffer: {composer.transcriptBuffer}
          </p>
        ) : null}
      </div>
    </div>
  );
}
