"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";

import styles from "../../adminAccessibility.module.css";
import { moveFocusTrap, resolveKeyboardShortcut } from "../../_lib/accessibilityKeyboard";

type ProposalReviewClientProps = {
  proposalId: string;
};

export function ProposalReviewClient({ proposalId }: ProposalReviewClientProps): ReactElement {
  const [decisionState, setDecisionState] = useState("No decision taken yet.");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((element) => !element.hasAttribute("disabled"));

    focusable[0]?.focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Tab") {
        event.preventDefault();
        const active = document.activeElement as HTMLElement | null;
        const currentIndex = Math.max(0, focusable.findIndex((element) => element === active));
        const next = moveFocusTrap(currentIndex, focusable.length, event.shiftKey);
        focusable[next]?.focus();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setDecisionState("Review closed without committing decision.");
        return;
      }

      const command = resolveKeyboardShortcut({ altKey: event.altKey, key: event.key });

      if (command === "approve" || command === "deny" || command === "escalate") {
        event.preventDefault();
        setDecisionState(`Decision recorded: ${command}`);
      }
    };

    panel.addEventListener("keydown", onKeyDown);
    return () => panel.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <h1>Proposal {proposalId}</h1>
        <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="proposal-review-title" aria-describedby="proposal-review-description" className={styles.dialog}>
          <h2 id="proposal-review-title">Proposal Review Dialog</h2>
          <p id="proposal-review-description">Use Alt+A, Alt+D, Alt+E for decisions. Escape closes with no decision.</p>
          <section aria-labelledby="proposal-content-title">
            <h3 id="proposal-content-title">Proposed Changes</h3>
            <p>Update chapter continuity references with release-safe timeline ordering.</p>
          </section>
          <section aria-labelledby="proposal-comments-title">
            <h3 id="proposal-comments-title">Comments</h3>
            <ol>
              <li>
                <strong>Editor One</strong> <span>2026-03-20</span>
                <p>Check the relationship arc for chronology overlap.</p>
                <button type="button" className={styles.linkButton}>Reply</button>
              </li>
              <li>
                <strong>Editor Two</strong> <span>2026-03-21</span>
                <p>Looks clear after draft history reconciliation.</p>
                <button type="button" className={styles.linkButton}>Reply</button>
              </li>
            </ol>
          </section>
          <fieldset className={styles.decisionFieldset}>
            <legend>Decision</legend>
            <button type="button" className={styles.actionButton} onClick={() => setDecisionState("Decision recorded: approve")}>Approve</button>
            <button type="button" className={styles.actionButton} onClick={() => setDecisionState("Decision recorded: deny")}>Deny</button>
            <button type="button" className={styles.actionButton} onClick={() => setDecisionState("Decision recorded: escalate")}>Escalate</button>
          </fieldset>
          <p className={styles.srOnly} aria-live="polite" aria-atomic="true">{decisionState}</p>
        </div>
      </div>
    </main>
  );
}
