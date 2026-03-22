import type { ChatMode } from "../types/ChatMode";

type ModeToggleProps = {
  modes: ChatMode[];
  currentModeId: string;
  onModeChange: (id: string) => void;
};

export function ModeToggle({ modes, currentModeId, onModeChange }: ModeToggleProps) {
  return (
    <fieldset className="rounded-xl border border-border bg-[rgba(255,255,255,0.02)] p-2">
      <legend className="px-2 text-xs uppercase tracking-[0.18em] text-text-muted">Mode</legend>
      <div className="flex flex-wrap gap-2 px-2 pb-2">
        {modes.map((mode) => {
          const isActive = currentModeId === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? "bg-[rgba(134,201,255,0.24)] text-text"
                  : "bg-[rgba(255,255,255,0.02)] text-text-muted hover:text-text"
              }`}
              onClick={() => onModeChange(mode.id)}
              aria-pressed={isActive}
              title={mode.description}
            >
              {mode.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
