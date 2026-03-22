import type { ReactElement, ReactNode } from "react";

import styles from "../../../app/admin/adminAccessibility.module.css";

type AdminSurfaceSectionCardProps = {
  headingId: string;
  title: ReactNode;
  children: ReactNode;
  ariaDescribedBy?: string;
  headingTag?: "h2" | "h3";
};

export function AdminSurfaceSectionCard({
  headingId,
  title,
  children,
  ariaDescribedBy,
  headingTag = "h2"
}: AdminSurfaceSectionCardProps): ReactElement {
  const HeadingTag = headingTag;

  return (
    <section aria-labelledby={headingId} aria-describedby={ariaDescribedBy} className={styles.sectionCard}>
      <HeadingTag id={headingId} className={styles.sectionTitle}>
        {title}
      </HeadingTag>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}