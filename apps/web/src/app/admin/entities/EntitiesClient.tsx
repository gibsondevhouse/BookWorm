"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactElement } from "react";

import styles from "../adminAccessibility.module.css";
import {
  moveFocusTrap,
  moveListCursor,
  resolveKeyboardShortcut,
  toAriaSort,
  validateEntityForm,
  type EntityFormValues
} from "../_lib/accessibilityKeyboard";

type EntityRow = {
  id: string;
  name: string;
  type: string;
  status: "DRAFT" | "REVIEW" | "PUBLISHED";
};

const seedEntities: EntityRow[] = [
  { id: "entity-01", name: "Ariadne Vale", type: "Character", status: "REVIEW" },
  { id: "entity-02", name: "Thornwatch Keep", type: "Location", status: "PUBLISHED" },
  { id: "entity-03", name: "The Ember Ledger", type: "Artifact", status: "DRAFT" }
];

const initialFormValues: EntityFormValues = {
  name: "",
  summary: "",
  category: ""
};

export function EntitiesClient(): ReactElement {
  const [query, setQuery] = useState("");
  const [sortDirection, setSortDirection] = useState<"none" | "ascending" | "descending">("none");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formValues, setFormValues] = useState(initialFormValues);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof EntityFormValues, string>>>({});
  const [errorSummary, setErrorSummary] = useState<string[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const filtered = useMemo(() => {
    const baseline = seedEntities.filter((entity) => entity.name.toLowerCase().includes(query.toLowerCase().trim()));

    if (sortDirection === "none") {
      return baseline;
    }

    return [...baseline].sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return sortDirection === "ascending" ? comparison : comparison * -1;
    });
  }, [query, sortDirection]);

  const selectedCount = selectedIds.size;
  const sortLabel = sortDirection === "none" ? "default order" : sortDirection === "ascending" ? "name ascending" : "name descending";

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent): void => {
      const command = resolveKeyboardShortcut({ altKey: event.altKey, key: event.key });

      if (command === "new-entity") {
        event.preventDefault();
        setIsEditOpen(true);
      }

      if (command === "cancel" && isEditOpen) {
        event.preventDefault();
        closeDialog();
      }

      if (command === "save" && isEditOpen) {
        event.preventDefault();
        submitForm();
      }
    };

    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, [isEditOpen, formValues]);

  useEffect(() => {
    setActiveIndex((current) => {
      if (filtered.length === 0) {
        return -1;
      }

      return Math.min(Math.max(current, 0), filtered.length - 1);
    });
  }, [filtered.length]);

  useEffect(() => {
    if (!isEditOpen) {
      return;
    }

    const dialogNode = dialogRef.current;

    if (!dialogNode) {
      return;
    }

    const focusable = Array.from(
      dialogNode.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((element) => !element.hasAttribute("disabled"));

    focusable[0]?.focus();

    const onDialogKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      event.preventDefault();
      const current = document.activeElement as HTMLElement | null;
      const currentIndex = Math.max(0, focusable.findIndex((element) => element === current));
      const next = moveFocusTrap(currentIndex, focusable.length, event.shiftKey);
      focusable[next]?.focus();
    };

    dialogNode.addEventListener("keydown", onDialogKeyDown);
    return () => dialogNode.removeEventListener("keydown", onDialogKeyDown);
  }, [isEditOpen]);

  const toggleSelection = (entityId: string): void => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(entityId)) {
        next.delete(entityId);
      } else {
        next.add(entityId);
      }

      return next;
    });
  };

  const onTableKeyDown = (event: ReactKeyboardEvent<HTMLTableSectionElement>): void => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActiveIndex((current) => moveListCursor(current, filtered.length, event.key));
      return;
    }

    if (event.key === " " && activeIndex >= 0) {
      event.preventDefault();
      const activeEntity = filtered[activeIndex];

      if (activeEntity) {
        toggleSelection(activeEntity.id);
      }
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      setIsEditOpen(true);
    }
  };

  const closeDialog = (): void => {
    setIsEditOpen(false);
    triggerRef.current?.focus();
  };

  const submitForm = (): void => {
    const validation = validateEntityForm(formValues);

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      setErrorSummary(validation.orderedErrorFields.map((field) => validation.errors[field] ?? ""));
      return;
    }

    setFormErrors({});
    setErrorSummary([]);
    closeDialog();
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <h1>Entity List</h1>
          <p className={styles.muted}>Use Alt+N to create, Enter to edit selected row, and Space to select rows.</p>
        </header>

        <section aria-labelledby="entity-controls-title">
          <h2 id="entity-controls-title">Entity Controls</h2>
          <div className={styles.controlsRow}>
            <label className={styles.labelGroup} htmlFor="entity-search">
              Search entities
              <input id="entity-search" className={styles.input} value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <button
              type="button"
              className={styles.button}
              onClick={() => setSortDirection((current) => (current === "ascending" ? "descending" : "ascending"))}
              aria-label="Sort by name"
            >
              Toggle sort
            </button>
            <button ref={triggerRef} type="button" className={`${styles.button} ${styles.primaryButton}`} onClick={() => setIsEditOpen(true)}>
              New Entity (Alt+N)
            </button>
          </div>
          <p id="entity-controls-help" className={styles.helperText}>Use the search box to narrow the table, then toggle sort to review names in the order that best matches your editing pass.</p>
          <div className={styles.summaryPanel}>
            <h3 className={styles.summaryTitle}>Working Set Summary</h3>
            <ul className={styles.summaryList}>
              <li>{filtered.length} entities visible.</li>
              <li>{selectedCount} entities selected.</li>
              <li>Current sort: {sortLabel}.</li>
            </ul>
          </div>
        </section>

        <section aria-labelledby="entity-list-title" aria-describedby="entity-controls-help">
          <h2 id="entity-list-title">Entities</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    aria-label="Select all entities"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={() =>
                      setSelectedIds(
                        selectedIds.size === filtered.length
                          ? new Set<string>()
                          : new Set(filtered.map((entity) => entity.id))
                      )
                    }
                  />
                </th>
                <th scope="col" aria-sort={toAriaSort(sortDirection)}>
                  <button type="button" className={styles.button} onClick={() => setSortDirection((current) => (current === "ascending" ? "descending" : "ascending"))}>
                    Name
                  </button>
                </th>
                <th scope="col">Type</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody onKeyDown={onTableKeyDown}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className={styles.emptyState}>
                      <h3 className={styles.emptyStateTitle}>No entities match the current filters.</h3>
                      <p className={styles.emptyStateDescription}>Try a broader search or clear filters to restore the full entity list.</p>
                      <button type="button" className={`${styles.button} ${styles.primaryButton}`} onClick={() => setQuery("")}>
                        Clear Search
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((entity, index) => (
                <tr key={entity.id} className={index === activeIndex ? styles.rowActive : ""}>
                  <td>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      aria-label={`Select ${entity.name}`}
                      checked={selectedIds.has(entity.id)}
                      onChange={() => toggleSelection(entity.id)}
                    />
                  </td>
                  <td>
                    <button type="button" className={styles.rowButton} onClick={() => setIsEditOpen(true)}>
                      {entity.name}
                    </button>
                  </td>
                  <td>
                    <span className={styles.typeBadge}>{entity.type}</span>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${
                      entity.status === "PUBLISHED"
                        ? styles.statusApproved
                        : entity.status === "REVIEW"
                          ? styles.statusPending
                          : styles.statusEscalated
                    }`}
                    >
                      {entity.status}
                    </span>
                  </td>
                  <td>
                    <button type="button" className={styles.button} onClick={() => setIsEditOpen(true)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {isEditOpen ? (
        <div className={styles.dialogBackdrop}>
          <div ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="entity-edit-title" aria-describedby="entity-edit-help">
            <div className={styles.dialogHeader}>
              <h2 id="entity-edit-title">Edit Entity</h2>
              <button type="button" className={styles.closeButton} onClick={closeDialog}>
                Close
              </button>
            </div>
            <p id="entity-edit-help">* indicates required field</p>
            {errorSummary.length > 0 ? (
              <div role="alert" aria-live="assertive" className={styles.errorSummary}>
                <strong>Fix the following before saving:</strong>
                <ul>
                  {errorSummary.map((error) => (
                    <li key={error}><span className={styles.errorIcon} aria-hidden="true">!</span>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitForm();
              }}
            >
              <fieldset className={styles.fieldset}>
                <legend>Entity Details</legend>
                <label className={styles.labelGroup} htmlFor="entity-name">
                  Name (required) *
                  <input
                    id="entity-name"
                    className={styles.input}
                    required
                    aria-required="true"
                    aria-describedby={formErrors.name ? "entity-name-error entity-name-hint" : "entity-name-hint"}
                    value={formValues.name}
                    onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <p id="entity-name-hint" className={styles.fieldHint}>Use the published display name readers will recognize in search and release views.</p>
                {formErrors.name ? <p id="entity-name-error" className={styles.fieldError}><span className={styles.errorIcon} aria-hidden="true">!</span>{formErrors.name}</p> : null}

                <label className={styles.labelGroup} htmlFor="entity-summary">
                  Summary (required) *
                  <textarea
                    id="entity-summary"
                    className={styles.input}
                    required
                    aria-required="true"
                    aria-describedby={formErrors.summary ? "entity-summary-error entity-summary-hint" : "entity-summary-hint"}
                    value={formValues.summary}
                    onChange={(event) => setFormValues((current) => ({ ...current, summary: event.target.value }))}
                  />
                </label>
                <p id="entity-summary-hint" className={styles.fieldHint}>Keep the summary brief and specific so it stays readable in dense admin lists.</p>
                {formErrors.summary ? <p id="entity-summary-error" className={styles.fieldError}><span className={styles.errorIcon} aria-hidden="true">!</span>{formErrors.summary}</p> : null}

                <label className={styles.labelGroup} htmlFor="entity-category">
                  Category (required) *
                  <select
                    id="entity-category"
                    className={styles.select}
                    required
                    aria-required="true"
                    aria-describedby={formErrors.category ? "entity-category-error entity-category-hint" : "entity-category-hint"}
                    value={formValues.category}
                    onChange={(event) => setFormValues((current) => ({ ...current, category: event.target.value }))}
                  >
                    <option value="">Select one</option>
                    <option value="character">Character</option>
                    <option value="location">Location</option>
                    <option value="artifact">Artifact</option>
                  </select>
                </label>
                <p id="entity-category-hint" className={styles.fieldHint}>Choose the category that matches how this record should be grouped in the codex.</p>
                {formErrors.category ? <p id="entity-category-error" className={styles.fieldError}><span className={styles.errorIcon} aria-hidden="true">!</span>{formErrors.category}</p> : null}
              </fieldset>
              <div className={styles.actions}>
                <button type="button" className={styles.button} onClick={closeDialog}>
                  Cancel (Alt+C)
                </button>
                <button type="submit" className={`${styles.button} ${styles.primaryButton}`}>
                  Save (Alt+S)
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
