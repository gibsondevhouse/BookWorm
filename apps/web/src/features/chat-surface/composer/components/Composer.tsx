import { useEffect, useId, useRef, useState } from "react";

import { useMouseSpotlight } from "../../../../app/hooks/useMouseSpotlight";
import { AutoResizeTextarea } from "./AutoResizeTextarea";
import { useComposerState } from "../hooks/useComposerState";
import type { ComposerProps } from "../types/ComposerProps";

const TOOL_BUTTON_CLASS =
  "tactile-press transition-spring inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border-glass)] bg-[rgba(10,16,29,0.4)] text-text-muted transition-[border-color,color,box-shadow,opacity] duration-150 ease-out hover:border-[rgba(134,201,255,0.2)] hover:text-text hover:shadow-[0_0_14px_var(--color-primary-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50";

type ComposerToolButtonProps = {
  "aria-label": string;
  disabled: boolean;
  onClick: () => void;
  isPressed?: boolean;
  className?: string;
  children: React.ReactNode;
};

function ComposerToolButton({
  "aria-label": ariaLabel,
  disabled,
  onClick,
  isPressed,
  className = "",
  children,
}: ComposerToolButtonProps) {
  return (
    <button
      type="button"
      className={`${TOOL_BUTTON_CLASS} ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={isPressed}
    >
      {children}
    </button>
  );
}

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
  const composerSpotlight = useMouseSpotlight<HTMLDivElement>();

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
      <div
        ref={composerSpotlight.spotlightRef}
        onPointerMove={composerSpotlight.onPointerMove}
        onPointerLeave={composerSpotlight.onPointerLeave}
        data-processing={isSubmitting || composer.isDictating}
        className="composer-panel composer-shimmer spotlight-surface pointer-events-auto flex w-full max-w-4xl flex-col gap-2 rounded-[1.75rem] p-4 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.44)] transition-all duration-500 focus-within:ring-1 focus-within:ring-[var(--color-primary-glow)] focus-within:shadow-[0_0_30px_var(--color-primary-glow)]"
      >
        {composer.isDictating && composer.transcriptBuffer ? (
          <p className="px-1 text-xs leading-snug text-text-muted" aria-live="polite">
            {composer.transcriptBuffer}
          </p>
        ) : null}

        {composer.stagedFiles.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Staged attachments">
            {composer.stagedFiles.map((file) => (
              <li
                key={file.id}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-glass)] bg-[rgba(10,16,29,0.46)] px-3 py-1 text-xs text-text"
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

        <AutoResizeTextarea
          textareaRef={textareaRef}
          value={composer.textPayload}
          placeholder={placeholder}
          disabled={disabled || isSubmitting}
          onChange={composer.setTextPayload}
          onSubmit={submit}
        />

        <input
          id={fileInputId}
          ref={fileInputRef}
          type="file"
          className="sr-only"
          multiple
          accept={allowedFileTypes.join(",")}
          onChange={handleFileInput}
        />

        <div className="flex flex-row justify-between items-center w-full">
          <div className="flex items-center gap-1">
              <ComposerToolButton
                aria-label="Upload files"
                disabled={disabled || isSubmitting}
                onClick={() => fileInputRef.current?.click()}
              >
                <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                  />
                </svg>
              </ComposerToolButton>

              <ComposerToolButton
                aria-label={composer.isDictating ? "Stop dictation" : "Start dictation"}
                disabled={!composer.speechSupported || disabled || isSubmitting}
                onClick={composer.toggleDictation}
                isPressed={composer.isDictating}
                className={
                  composer.isDictating
                    ? "border-[rgba(255,128,128,0.35)] bg-[rgba(190,70,70,0.2)] text-[rgb(255,151,151)]"
                    : ""
                }
              >
                <span className="relative inline-flex items-center justify-center">
                  {composer.isDictating ? (
                    <span className="absolute h-6 w-6 rounded-full bg-[rgba(255,120,120,0.25)] animate-ping" aria-hidden />
                  ) : null}
                  <svg aria-hidden className="relative h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zm5 9a5 5 0 11-10 0m5 5v4m-3 0h6"
                    />
                  </svg>
                </span>
              </ComposerToolButton>

              <div className="relative">
                <button
                  ref={connectorButtonRef}
                  type="button"
                  className={TOOL_BUTTON_CLASS}
                  onClick={() => setIsConnectorPopoverOpen((prev) => !prev)}
                  disabled={disabled || isSubmitting}
                  aria-label="Configure connectors"
                  aria-expanded={isConnectorPopoverOpen}
                  aria-controls={popoverId}
                  aria-haspopup="dialog"
                >
                  <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="absolute bottom-12 left-0 z-30 w-72 rounded-2xl border border-[var(--color-border-glass)] bg-[rgba(10,16,29,0.76)] p-3 backdrop-blur-2xl"
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
                          <label className="flex cursor-pointer items-start gap-2 rounded-xl px-2 py-1.5 hover:shadow-[0_0_12px_var(--color-primary-glow)]">
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

              <select
                className="tactile-press transition-spring h-9 min-w-28 rounded-full border border-[var(--color-border-glass)] bg-[rgba(10,16,29,0.4)] px-3 text-xs uppercase tracking-[0.12em] text-text transition-[border-color,color,box-shadow,opacity] duration-150 ease-out hover:border-[rgba(134,201,255,0.2)] hover:shadow-[0_0_12px_var(--color-primary-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
            </div>

            <button
              type="button"
              className="btn-primary-neural tactile-press transition-spring inline-flex h-9 w-9 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-55"
              aria-label="Send message"
              onClick={submit}
              disabled={disabled || isSubmitting}
            >
              <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M13 6l6 6-6 6"
                />
              </svg>
            </button>
          </div>

        {composer.attachmentError ? (
          <p className="mt-2 text-xs text-[rgb(235,120,120)]">{composer.attachmentError}</p>
        ) : null}

        {composer.dictationError ? (
          <p className="mt-1 text-xs text-[rgb(235,120,120)]">{composer.dictationError}</p>
        ) : null}
      </div>
    </div>
  );
}
