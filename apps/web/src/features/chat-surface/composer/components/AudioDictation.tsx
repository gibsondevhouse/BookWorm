type AudioDictationProps = {
  isDictating: boolean;
  transcript: string;
  error: string | null;
  speechSupported: boolean;
  onToggle: () => void;
};

export function AudioDictation({
  isDictating,
  transcript,
  error,
  speechSupported,
  onToggle,
}: AudioDictationProps) {
  return (
    <div className="rounded-xl border border-border bg-[rgba(255,255,255,0.02)] p-2">
      <button
        type="button"
        onClick={onToggle}
        disabled={!speechSupported}
        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-opacity ${
          speechSupported ? "opacity-100" : "opacity-50"
        }`}
        aria-label={isDictating ? "Stop dictation" : "Start dictation"}
        aria-pressed={isDictating}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full bg-primary ${isDictating ? "animate-pulse" : "opacity-60"}`}
          aria-hidden
        />
        {isDictating ? "Listening..." : "Dictate"}
      </button>

      {transcript ? (
        <p className="mt-2 text-xs leading-5 text-text-muted" aria-live="polite">
          Transcript buffer: {transcript}
        </p>
      ) : null}

      {error ? <p className="mt-2 text-xs text-[rgb(235,120,120)]">{error}</p> : null}
    </div>
  );
}
