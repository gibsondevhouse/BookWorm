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

export function EditEntityPageClient({ slug }: EditEntityPageClientProps): ReactElement {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof EntityFormValues, string>>>({});

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const result = validateEntityForm(values);

    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <h1>Edit Entity: {slug}</h1>
        <p className={styles.muted}>* indicates required field</p>
        <form onSubmit={onSubmit}>
          {Object.keys(errors).length > 0 ? (
            <div role="alert" aria-live="assertive" className={styles.errorSummary}>
              <strong>Fix the required fields before saving.</strong>
            </div>
          ) : null}
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
            {errors.name ? <p id="edit-entity-name-error" className={styles.fieldError}>! {errors.name}</p> : null}

            <label className={styles.labelGroup} htmlFor="edit-entity-summary">
              Summary (required) *
              <textarea
                id="edit-entity-summary"
                className={styles.input}
                required
                aria-required="true"
                aria-describedby={errors.summary ? "edit-entity-summary-error" : undefined}
                value={values.summary}
                onChange={(event) => setValues((current) => ({ ...current, summary: event.target.value }))}
              />
            </label>
            {errors.summary ? <p id="edit-entity-summary-error" className={styles.fieldError}>! {errors.summary}</p> : null}

            <label className={styles.labelGroup} htmlFor="edit-entity-category">
              Category (required) *
              <select
                id="edit-entity-category"
                className={styles.select}
                required
                aria-required="true"
                aria-describedby={errors.category ? "edit-entity-category-error" : undefined}
                value={values.category}
                onChange={(event) => setValues((current) => ({ ...current, category: event.target.value }))}
              >
                <option value="">Select one</option>
                <option value="character">Character</option>
                <option value="location">Location</option>
                <option value="artifact">Artifact</option>
              </select>
            </label>
            {errors.category ? <p id="edit-entity-category-error" className={styles.fieldError}>! {errors.category}</p> : null}
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
