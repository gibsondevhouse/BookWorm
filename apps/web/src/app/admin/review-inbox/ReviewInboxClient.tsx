"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactElement } from "react";

import styles from "../adminAccessibility.module.css";
import { moveFocusTrap, moveListCursor, resolveKeyboardShortcut } from "../_lib/accessibilityKeyboard";

type ProposalStatus = "PENDING" | "ESCALATED" | "APPROVED";

type ProposalRow = {
  id: string;
  title: string;
  status: ProposalStatus;
  priority: "HIGH" | "MEDIUM" | "LOW";
  requester: string;
};

const proposals: ProposalRow[] = [
  { id: "prop-01", title: "Gatehouse Character Revision", status: "PENDING", priority: "HIGH", requester: "Mira Editor" },
  { id: "prop-02", title: "Archive Glossary Patch", status: "ESCALATED", priority: "MEDIUM", requester: "Jules Reviewer" },
  { id: "prop-03", title: "Companion Timeline Clarification", status: "PENDING", priority: "LOW", requester: "Nora Analyst" }
];

export function ReviewInboxClient(): ReactElement {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedProposal, setSelectedProposal] = useState<ProposalRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | "ALL">("ALL");
  const [liveMessage, setLiveMessage] = useState("3 items found");
  const [decisionMessage, setDecisionMessage] = useState("");
  const inboxRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return proposals.filter((proposal) => {
      const statusMatch = statusFilter === "ALL" || proposal.status === statusFilter;
      const queryMatch = proposal.title.toLowerCase().includes(query.toLowerCase().trim());
      return statusMatch && queryMatch;
    });
  }, [query, statusFilter]);

  useEffect(() => {
    setActiveIndex((current) => {
      if (filtered.length === 0) {
        return -1;
      }

      return Math.min(Math.max(current, 0), filtered.length - 1);
    });
    setLiveMessage(`${filtered.length} items found`);
  }, [filtered.length]);

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent): void => {
      const command = resolveKeyboardShortcut({ altKey: event.altKey, key: event.key });

      if (command === "focus-inbox") {
        event.preventDefault();
        inboxRef.current?.focus();
      }

      if (selectedProposal && (command === "approve" || command === "deny" || command === "escalate")) {
        event.preventDefault();
        setDecisionMessage(`Decision recorded: ${command} for ${selectedProposal.title}`);
      }
    };

    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, [selectedProposal]);

  useEffect(() => {
    if (!selectedProposal) {
      return;
    }

    const dialogNode = dialogRef.current;

    if (!dialogNode) {
      return;
    }

    const focusableElements = Array.from(
      dialogNode.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((element) => !element.hasAttribute("disabled"));

    focusableElements[0]?.focus();

    const handleTrap = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedProposal(null);
        setDecisionMessage("");
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      if (focusableElements.length === 0) {
        return;
      }

      event.preventDefault();
      const active = document.activeElement as HTMLElement | null;
      const currentIndex = Math.max(0, focusableElements.findIndex((element) => element === active));
      const nextIndex = moveFocusTrap(currentIndex, focusableElements.length, event.shiftKey);
      focusableElements[nextIndex]?.focus();
    };

    dialogNode.addEventListener("keydown", handleTrap);
    return () => dialogNode.removeEventListener("keydown", handleTrap);
  }, [selectedProposal]);

  const onListKeyDown = (event: ReactKeyboardEvent<HTMLUListElement>): void => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActiveIndex((current) => moveListCursor(current, filtered.length, event.key));
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      setSelectedProposal(filtered[activeIndex] ?? null);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <h1 ref={inboxRef} tabIndex={-1}>Review Inbox</h1>
          <p className={styles.muted}>Use Alt+I to focus inbox, arrows to move rows, and Enter to review.</p>
        </header>

        <section aria-labelledby="review-filters-title">
          <h2 id="review-filters-title">Filters</h2>
          <div className={styles.controlsRow}>
            <label className={styles.labelGroup} htmlFor="review-search">
              Search proposals
              <input id="review-search" className={styles.input} value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <label className={styles.labelGroup} htmlFor="review-status-filter">
              Status
              <select
                id="review-status-filter"
                className={styles.select}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ProposalStatus | "ALL")}
              >
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="ESCALATED">Escalated</option>
                <option value="APPROVED">Approved</option>
              </select>
            </label>
          </div>
          <p className={styles.srOnly} aria-live="polite" aria-atomic="true">{liveMessage}</p>
        </section>

        <section aria-labelledby="review-list-title">
          <h2 id="review-list-title">Pending Proposals</h2>
          <ul className={styles.list} role="listbox" aria-label="Review proposals" onKeyDown={onListKeyDown}>
            {filtered.map((proposal, index) => (
              <li key={proposal.id} role="option" aria-selected={activeIndex === index} className={`${styles.listItem} ${activeIndex === index ? styles.rowActive : ""}`}>
                <button type="button" className={styles.rowButton} onClick={() => setSelectedProposal(proposal)}>
                  {proposal.title}
                </button>
                <span>Status: {proposal.status}</span>
                <span>Priority: {proposal.priority}</span>
                <span>Requester: {proposal.requester}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {selectedProposal ? (
        <div className={styles.dialogBackdrop}>
          <div ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="proposal-title" aria-describedby="proposal-context">
            <div className={styles.dialogHeader}>
              <h2 id="proposal-title">{selectedProposal.title}</h2>
              <button type="button" className={styles.closeButton} onClick={() => setSelectedProposal(null)}>
                Close
              </button>
            </div>
            <p id="proposal-context">Proposal review detail with keyboard-trapped focus and decision shortcuts.</p>
            <ol aria-label="Proposal comments">
              <li>
                <strong>Mira Editor</strong> <span>(2026-03-20)</span>
                <p>Please verify continuity references in chapter 4.</p>
                <button type="button" className={styles.linkButton}>Reply</button>
              </li>
              <li>
                <strong>Nora Analyst</strong> <span>(2026-03-21)</span>
                <p>Cross-reference matches the release notes.</p>
                <button type="button" className={styles.linkButton}>Reply</button>
              </li>
            </ol>
            <fieldset className={styles.decisionFieldset}>
              <legend>Decision</legend>
              <button type="button" className={styles.actionButton} onClick={() => setDecisionMessage(`Decision recorded: approve for ${selectedProposal.title}`)}>
                Approve (Alt+A)
              </button>
              <button type="button" className={styles.actionButton} onClick={() => setDecisionMessage(`Decision recorded: deny for ${selectedProposal.title}`)}>
                Deny (Alt+D)
              </button>
              <button type="button" className={styles.actionButton} onClick={() => setDecisionMessage(`Decision recorded: escalate for ${selectedProposal.title}`)}>
                Escalate (Alt+E)
              </button>
            </fieldset>
            <p className={styles.srOnly} aria-live="polite" aria-atomic="true">{decisionMessage}</p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
