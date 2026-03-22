import type { ReactElement, ReactNode } from "react";

import styles from "../../../app/admin/adminAccessibility.module.css";

type AdminSurfaceSectionCardProps = {
  headingId: string;
  title: ReactNode;
  children: ReactNode;
  ariaDescribedBy?: string;
};

export function AdminSurfaceSectionCard({
  headingId,
  title,
  children,
  ariaDescribedBy
}: AdminSurfaceSectionCardProps): ReactElement {
  return (
    <section aria-labelledby={headingId} aria-describedby={ariaDescribedBy} className={styles.sectionCard}>
      <h2 id={headingId} className={styles.sectionTitle}>
        {title}
      </h2>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}