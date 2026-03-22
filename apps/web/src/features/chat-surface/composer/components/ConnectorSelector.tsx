import { useEffect, useRef, useState } from "react";

import type { Connector } from "../types/Connector";

type ConnectorSelectorProps = {
  connectors: Connector[];
  onToggleConnector: (id: string) => void;
};

export function ConnectorSelector({ connectors, onToggleConnector }: ConnectorSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>('button, input[type="checkbox"], [tabindex]:not([tabindex="-1"])'),
    );

    focusables[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleClickOutside = (event: MouseEvent): void => {
      if (!panel.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const enabledCount = connectors.filter((connector) => connector.enabled).length;

  return (
    <div className="relative">
      <button
        type="button"
        className="rounded-lg border border-border bg-[rgba(255,255,255,0.02)] px-3 py-2 text-sm text-text-muted hover:text-text"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Choose connectors"
      >
        Connectors ({enabledCount})
      </button>

      {isOpen ? (
        <div
          ref={panelRef}
          className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-border bg-paper p-3 shadow-xl"
          role="dialog"
          aria-label="Connector selector"
        >
          <ul className="space-y-2">
            {connectors.map((connector) => (
              <li key={connector.id}>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-[rgba(255,255,255,0.03)]">
                  <input
                    type="checkbox"
                    checked={connector.enabled}
                    onChange={() => onToggleConnector(connector.id)}
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
  );
}
