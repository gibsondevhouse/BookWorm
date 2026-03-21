"use client";

import { useState, type FormEvent, type ReactElement } from "react";

import styles from "../../../adminAccessibility.module.css";
import { validateEntityForm, type EntityFormValues } from "../../../_lib/accessibilityKeyboard";

type EditEntityPageClientProps = {
  slug: string;
};

const initialValues: EntityFormValues = {
  name: "",
  summary: "",
  category: ""
};

const fieldDescriptions: Record<keyof EntityFormValues, string> = {
  name: "Provide the reader-facing name that should appear in admin lists and public codex views.",
  summary: "Write a short summary that explains why this entity matters without repeating metadata.",
  category: "Choose the grouping that best matches how the entity should be published and filtered."
};

export function EditEntityPageClient({ slug }: EditEntityPageClientProps): ReactElement {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof EntityFormValues, string>>>({});
  const [saveMessage, setSaveMessage] = useState("");

  const errorEntries = Object.entries(errors) as Array<[keyof EntityFormValues, string]>;

  const toFieldDescription = (field: keyof EntityFormValues): string => {
    const hintId = `edit-entity-${field}-hint`;
    const errorId = `edit-entity-${field}-error`;
    return errors[field] ? `${errorId} ${hintId}` : hintId;
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const result = validateEntityForm(values);

    if (!result.isValid) {
      setErrors(result.errors);
      setSaveMessage("");
      return;
    }

    setErrors({});
    setSaveMessage("Entity details are ready to save. No validation issues remain.");
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <h1>Edit Entity: {slug}</h1>
        <p className={styles.muted}>* indicates required field</p>
        <section className={styles.summaryPanel} aria-labelledby="edit-guidance-title">
          <h2 id="edit-guidance-title" className={styles.summaryTitle}>Editing Guidance</h2>
          <ul className={styles.summaryList}>
            <li>Complete the required fields before saving.</li>
            <li>Use the field hints to keep names, summaries, and categories consistent with release-ready metadata.</li>
            <li>Review the validation summary links if the form blocks save.</li>
          </ul>
        </section>
        <form onSubmit={onSubmit}>
          {errorEntries.length > 0 ? (
            <div role="alert" aria-live="assertive" className={styles.errorSummary}>
              <span className={styles.errorIcon} aria-hidden="true">!</span>
              <strong>Fix the required fields before saving.</strong>
              <ul className={styles.inlineList}>
                {errorEntries.map(([field, message]) => (
                  <li key={field}>
                    <a href={`#edit-entity-${field}`}>{message}</a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {saveMessage ? <p className={styles.successMessage} aria-live="polite">{saveMessage}</p> : null}
          <fieldset className={styles.fieldset}>
            <legend>Entity Profile</legend>
            <label className={styles.labelGroup} htmlFor="edit-entity-name">
              Name (required) *
              <input
                id="edit-entity-name"
                className={styles.input}
                required
                aria-required="true"
                aria-describedby={errors.name ? "edit-entity-name-error" : undefined}
                value={values.name}
                onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <p id="edit-entity-name-hint" className={styles.fieldHint}>{fieldDescriptions.name}</p>
            {errors.name ? <p id="edit-entity-name-error" className={styles.fieldError}><span className={styles.errorIcon} aria-hidden="true">!</span>{errors.name}</p> : null}

            <label className={styles.labelGroup} htmlFor="edit-entity-summary">
              Summary (required) *
              <textarea
                id="edit-entity-summary"
                className={styles.input}
                required
                aria-required="true"
                aria-describedby={toFieldDescription("summary")}
                value={values.summary}
                onChange={(event) => setValues((current) => ({ ...current, summary: event.target.value }))}
              />
            </label>
            <p id="edit-entity-summary-hint" className={styles.fieldHint}>{fieldDescriptions.summary}</p>
            {errors.summary ? <p id="edit-entity-summary-error" className={styles.fieldError}><span className={styles.errorIcon} aria-hidden="true">!</span>{errors.summary}</p> : null}

            <label className={styles.labelGroup} htmlFor="edit-entity-category">
              Category (required) *
              <select
                id="edit-entity-category"
                className={styles.select}
                required
                aria-required="true"
                aria-describedby={toFieldDescription("category")}
                value={values.category}
                onChange={(event) => setValues((current) => ({ ...current, category: event.target.value }))}
              >
                <option value="">Select one</option>
                <option value="character">Character</option>
                <option value="location">Location</option>
                <option value="artifact">Artifact</option>
              </select>
            </label>
            <p id="edit-entity-category-hint" className={styles.fieldHint}>{fieldDescriptions.category}</p>
            {errors.category ? <p id="edit-entity-category-error" className={styles.fieldError}><span className={styles.errorIcon} aria-hidden="true">!</span>{errors.category}</p> : null}
          </fieldset>
          <div className={styles.actions}>
            <button type="button" className={styles.button}>Cancel (Alt+C)</button>
            <button type="submit" className={`${styles.button} ${styles.primaryButton}`}>Save (Alt+S)</button>
          </div>
        </form>
      </div>
    </main>
  );
}
